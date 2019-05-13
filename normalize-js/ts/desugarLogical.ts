/**
 * Preconditions:
 *
 * 1. The program only contains while loops
 *
 * Postconditions:
 *
 *   1. Function calls do not occur within &&-expressions, ||-expressions,
 *      ternary expressions, and  expression sequences (the comma operator).
 *   2. Function applications do not occur in a loop guard.
 */
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { containsCall } from '@stopify/util';
import { fresh, nameExprBefore } from '@stopify/hygiene';
import * as bh from '@stopify/util';

export const visitor: Visitor = {
  WhileStatement: function (path: NodePath<t.WhileStatement>) {
    if (!containsCall(path.get('test')) && path.node.test.type !== 'CallExpression') {
      return;
    }
    const test = path.node.test;
    path.get('test').replaceWith(t.booleanLiteral(true));
    path.get('body').replaceWith(t.blockStatement([
      bh.sIf(test, path.node.body, t.breakStatement())
    ]));
  },

  LogicalExpression(path: NodePath<t.LogicalExpression>) {
    if (!containsCall(path)) {
      return;
    }

    const op = path.node.operator;
    const stmt = path.getStatementParent();
    const lhs = nameExprBefore(stmt, path.node.left);
    const r = fresh(op === "&&" ? "and" : "or");

    stmt.insertBefore(
      t.variableDeclaration("let", [t.variableDeclarator(r)]));

    const x = t.blockStatement([t.expressionStatement(
      t.assignmentExpression("=", r, path.node.right))]);
    const y = t.blockStatement([t.expressionStatement(
      t.assignmentExpression("=", r, lhs))]);

    if (op === "&&") {
      stmt.insertBefore(t.ifStatement(lhs, x, y));
    }
    else {
      stmt.insertBefore(t.ifStatement(lhs, y, x));
    }
    path.replaceWith(r);
  },

  SequenceExpression(path: NodePath<t.SequenceExpression>) {
    if (containsCall(path) === false) {
      return;
    }
    const exprs = path.node.expressions;
    if (exprs.length < 2) {
      // This probably won't happen in a parsed program.
      path.replaceWith(exprs[0]);
      return;
    }
    const last = exprs[exprs.length - 1];
    const rest = exprs.slice(0, exprs.length - 1);
    const stmt = path.getStatementParent();
    for (const expr of rest) {
      stmt.insertBefore(t.expressionStatement(expr));
    }
    path.replaceWith(last);
  },

  ConditionalExpression(path: NodePath<t.ConditionalExpression>) {
    if (!containsCall(path)) {
      return;
    }

    const r = fresh("cond");

    const stmt = path.getStatementParent();
    stmt.insertBefore(
      t.variableDeclaration("let", [t.variableDeclarator(r)]));
      const test = nameExprBefore(stmt, path.node.test);
    stmt.insertBefore(
      t.ifStatement(
        test,
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression("=", r, path.node.consequent))]),
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression("=", r, path.node.alternate))])
      ));
    path.replaceWith(r);
  }
};

function main() {
  const filename = process.argv[2];
  const opts = {
    plugins: [() => ({ visitor })],
    babelrc: false
  };
  babel.transformFile(filename, opts, (err, result) => {
    if (err !== null) {
      throw err;
    }
    console.log(result.code);
  });
}

if (require.main === module) {
  main();
}
