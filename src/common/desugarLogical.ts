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
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';


const containsCallVisitor = {
  FunctionExpression(path: NodePath<t.FunctionExpression>): void {
    path.skip();
  },

  CallExpression(path: NodePath<t.CallExpression>) {
    this.containsCall = true;
    path.stop();
  }
};

function containsCall<T>(path: NodePath<T>) {
  let o = { containsCall: false };
  path.traverse(containsCallVisitor, o);
  return o.containsCall;
}

export const visitor: Visitor = {
  WhileStatement: function (path: NodePath<t.WhileStatement>) {
    if (!containsCall(path.get('test')) && path.node.test.type !== 'CallExpression') {
      return;
    }
    const test = path.node.test;
    path.get('test').replaceWith(t.booleanLiteral(true));
    path.get('body').replaceWith(t.blockStatement([
      t.ifStatement(test, path.node.body, t.breakStatement())
    ]));
  },

  LogicalExpression(path: NodePath<t.LogicalExpression>) {
    if (!containsCall(path)) {
      return;
    }

    const op = path.node.operator;
    const stmt = path.getStatementParent();
    const r = stmt.scope.generateUidIdentifier(op === "&&" ? "and" : "or");
    const lhs = stmt.scope.generateUidIdentifier("lhs");


    stmt.insertBefore(letExpression(lhs, path.node.left));
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

    const r = path.scope.generateUidIdentifier("cond");
    const test = path.scope.generateUidIdentifier("test");

    const stmt = path.getStatementParent();
    stmt.insertBefore(
      t.variableDeclaration("let", [t.variableDeclarator(r)]));
    stmt.insertBefore(
      t.variableDeclaration(
        "const",
        [t.variableDeclarator(test, path.node.test)]));
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
}

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
