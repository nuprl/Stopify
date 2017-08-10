import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as stopifyCallCC from './stopifyCallCC';
import * as assert from 'assert';

/** Implements --transform=original. This doesn't instrument the program to be
 * stoppable, but it still wraps it in a module. Therefore, we can time its
 * execution using existing benchmarking infrastructure.
 */
function fakeModule(path: NodePath<t.Program>) {
  const isStop = t.identifier("$isStop");
  const onStop = t.identifier("$onStop");
  const onDone = t.identifier("$onDone");
  const opts = t.identifier("$opts");

  path.node.body.push(t.returnStatement(t.callExpression(onDone, [])));

  path.node.body = [t.expressionStatement(
    t.assignmentExpression(
      '=',
      t.memberExpression(t.identifier('module'), t.identifier('exports')),
      t.functionExpression(
        void 0,
        [isStop, onStop, onDone, opts], 
        t.blockStatement(path.node.body))))];
}
const visitor: Visitor = {
  Program(path: NodePath<t.Program>, { opts }) {
    path.stop();
    if (opts.captureMethod === 'original') {
      fakeModule(path);
      return;
    }
    h.transformFromAst(path, [ [stopifyCallCC.plugin, opts]  ]);
    assert.equal(path.node.body.length, 1);
    const stmt = path.node.body[0];
    if (stmt.type !== 'ExpressionStatement') {
      throw 'Expected ExpressionStatement';
    }
    const expr = stmt.expression;
    stmt.expression = 
      t.assignmentExpression(
        '=',
        t.memberExpression(t.identifier('module'), t.identifier('exports')),
        expr);
  }
};

export default function() {
  return { visitor };
}
