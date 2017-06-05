/**
 * Plugin to transform function applications into `apply` calls and define
 * `apply` at the top-level as stoppable.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import { letExpression } from './helpers'
import {Administrative, administrative} from './helpers';

type isTrampolined<T> = T & {
  isTrampolined?: boolean
}

function trampoline<T>(node: T): isTrampolined<T> {
  (<isTrampolined<T>>node).isTrampolined = true;
  return node
}

const trampolineApplyVisitor : Visitor = {
  Program(path: NodePath<t.Program>): void {
    const runProg = t.expressionStatement(administrative(t.callExpression(
      t.identifier('$runTrampolined'), [t.identifier('$runProg')]
    )))
    path.node.body = [letExpression(t.identifier('$runProg'),
      (<t.ExpressionStatement>path.node.body[0]).expression), runProg]
  },

  ReturnStatement(path: NodePath<isTrampolined<t.ReturnStatement>>): void {
    if(path.node.isTrampolined) {
      return;
    }
    else {
      trampoline(path.node)
      path.node.argument = t.objectExpression([
        t.objectProperty(t.identifier('tramp'), t.booleanLiteral(true)),
        t.objectMethod('method', t.identifier('f'), [],
          t.blockStatement([trampoline(t.returnStatement(path.node.argument))]))])
    }
  }
}

module.exports = function() {
  return { visitor: trampolineApplyVisitor };
};
