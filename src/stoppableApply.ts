/**
 * Plugin to transform function applications into `apply` calls and define
 * `apply` at the top-level as stoppable.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import {Administrative, Call, Apply} from './helpers';

const stopApplyVisitor : Visitor = {
    CallExpression: function (path: NodePath<t.CallExpression>): void {
      type C = t.CallExpression;
      let applyId = null;
      if ((<Administrative<C>>path.node).isAdmin !== undefined) {
        applyId = t.identifier('admin_apply');
      } else if ((<Call<C>>path.node).isCall !== undefined) {
        applyId = t.identifier('call_apply');
      } else if ((<Apply<C>>path.node).isApply !== undefined) {
        applyId = t.identifier('apply_apply');
      } else {
        applyId = t.identifier('apply');
      }
      const applyArgs = [path.node.callee, ...path.node.arguments];
      const applyCall = t.callExpression(applyId, applyArgs);
      path.node.callee = applyId;
      path.node.arguments = applyArgs;
    }
}

module.exports = function() {
    return { visitor: stopApplyVisitor };
};
