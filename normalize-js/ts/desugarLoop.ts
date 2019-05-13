/**
 * Module to desugar all loops to while loops. This requires
 * the following transformations to be done:
 *
 * This plugin must enforce the following assumption about loops:
 *
 * Loop bodies are BlockStatements:
 * Loops can have an ExpressionStatement for their body. This messes
 * up the anf pass since it tries to added the complex named expression
 * to the nearest statement. In this case, the statement will be
 * outside the body of the for loop, effectively hoisting them outside
 * the function body. To fix this, the body of all loops should a statement.
 *
 * Postconditions:
 *
 *   1. The program only has while loops.
 */

import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from '@stopify/util';
import { fresh } from '@stopify/hygiene';

interface State {
  [orig: string]: t.Identifier[];
}

// Object containing the visitor functions
const loopVisitor : Visitor = {
  ForInStatement(path: NodePath<h.While<t.ForInStatement>>): void {
    const { left, right, body } = path.node;
    const it_obj = fresh('it_obj');
    const keys = fresh('keys');
    const idx = fresh('idx');
    const prop = t.isVariableDeclaration(left) ?
    t.variableDeclaration(left.kind, [
      t.variableDeclarator(left.declarations[0].id, t.memberExpression(keys, idx, true))
    ]) :
    t.expressionStatement(t.assignmentExpression('=', left, t.memberExpression(keys, idx, true)));

    path.insertBefore(h.letExpression(it_obj, right));
    let newBody: t.Statement = h.flatBodyStatement([
      h.letExpression(keys, t.callExpression(t.memberExpression(t.identifier('Object'),
        t.identifier('keys')), [it_obj]), 'const'),
      t.forStatement(h.letExpression(idx, t.numericLiteral(0)),
        t.binaryExpression('<', idx, t.memberExpression(keys, t.identifier('length'))),
        t.updateExpression('++', idx),
        h.flatBodyStatement([prop, body])),
      t.expressionStatement(t.assignmentExpression('=', it_obj,
        t.callExpression(t.memberExpression(t.identifier('Object'),
          t.identifier('getPrototypeOf')), [it_obj])))
    ]);
    if (path.node.continue_label) {
      newBody = t.labeledStatement(path.node.continue_label, newBody);
      (<any>newBody).skip = true;
    }

    path.replaceWith(h.continueLbl(t.whileStatement(t.binaryExpression('!==',
      it_obj, t.nullLiteral()), newBody), <any>path.node.continue_label));
  },

  // Convert For Statements into While Statements
  ForStatement(path: NodePath<h.While<t.ForStatement>>): void {
    const node = path.node;
    let { init, test, update, body: wBody } = node;
    let nupdate : t.Statement|t.Expression = update;

    // New body is a the old body with the update appended to the end.
    if (nupdate === null) {
      nupdate = t.emptyStatement();
    } else {
      nupdate = t.expressionStatement(update);
    }

    const loopContinue = path.node.continue_label ||
      fresh('loop_continue');
    const labelContinue = t.labeledStatement(loopContinue, wBody);
    (<any>labelContinue).skip = true;

    wBody = t.blockStatement([
      labelContinue,
      nupdate,
    ]);

    // Test can be null
    if (test === null) {
      test = t.booleanLiteral(true);
    }

    const wl = h.continueLbl(t.whileStatement(test, wBody), loopContinue);

    // The init can either be a variable declaration or an expression
    let nInit : t.Statement = t.emptyStatement();
    if (init !== null) {
      nInit = t.isExpression(init) ? t.expressionStatement(init) : init;
    }

    h.replaceWithStatements(path, nInit, wl);
  },

  // Convert do-while statements into while statements.
  DoWhileStatement(path: NodePath<h.While<t.DoWhileStatement>>): void {
    const node = path.node;
    let { test, body } = node;

    // Add flag to run the while loop at least once
    const runOnce = fresh('runOnce');
    const runOnceInit = t.variableDeclaration('let',
      [t.variableDeclarator(runOnce, t.booleanLiteral(true))]);
    const runOnceSetFalse =
    t.expressionStatement(
      t.assignmentExpression('=', runOnce, t.booleanLiteral(false)));
    body = h.flatBodyStatement([runOnceSetFalse, body]);
    if (path.node.continue_label) {
      body = t.labeledStatement(path.node.continue_label, body);
      (<any>body).skip = true;
    }

    test = t.logicalExpression('||', runOnce, test);

    h.replaceWithStatements(path,runOnceInit,
      h.continueLbl(t.whileStatement(test, body),
        <any>path.node.continue_label));
  },

  WhileStatement(path: NodePath<h.While<h.Break<t.WhileStatement>>>): void {
    if (!path.node.continue_label) {
      const loopContinue = fresh('loop_continue');
      // Wrap the body in a labeled continue block.
      path.node = h.continueLbl(path.node, loopContinue);
      path.node.body = t.labeledStatement(loopContinue, path.node.body);
      (<any>path.node.body).skip = true;
    }

    // Wrap the loop in labeled break block.
    if (!path.node.break_label) {
      const loopBreak = fresh('loop_break');
      path.node = h.breakLbl(path.node, loopBreak);
      const labeledStatement = t.labeledStatement(loopBreak, path.node);
      (<any>labeledStatement).skip = true;
      path.replaceWith(labeledStatement);
    }
  },

  LabeledStatement: {
    enter(path: NodePath<t.LabeledStatement>, s: State): void {
      if ((<any>path.node).skip) {
        return;
      }
      const { label, body } = path.node;
      if (t.isLoop(body) && !(<any>body).continue_label) {
        const lbl = fresh('loop_continue');
        if (!(label.name in s)) {
          s[label.name] = [lbl];
        } else {
          s[label.name].push(lbl);
        }
        if (t.isWhileStatement(path.node.body)) {
          const lblWhileBody = t.labeledStatement(lbl, body.body);
          (<any>lblWhileBody).skip = true;
          path.node.body.body = h.continueLbl(lblWhileBody, lbl);
        } else {
          path.node.body = h.continueLbl(body, lbl);
        }
      }
    },

    exit(path: NodePath<t.LabeledStatement>, s: State): void {
      if ((<any>path.node).skip) {
        return;
      }
      const { label, body } = path.node;
      if (t.isLoop(body)) {
        s[label.name].pop();
      }
    },
  },

  ContinueStatement(path: NodePath<t.ContinueStatement>, s: State): void {
    const { label } = path.node;
    if (label) {
      const lbls = s[label.name];
      path.node.label = lbls[lbls.length - 1];
    }
  }
};

module.exports = function() {
  return { visitor: loopVisitor };
};
