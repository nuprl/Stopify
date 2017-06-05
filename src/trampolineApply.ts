/**
 * Plugin to transform function applications into `apply` calls and define
 * `apply` at the top-level as stoppable.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';

type isTrampolined<T> = T & {
  isTrampolined?: boolean
}

function trampoline<T>(node: T): isTrampolined<T> {
  (<isTrampolined<T>>node).isTrampolined = true;
  return node
}

const trampolineApplyVisitor : Visitor = {
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
