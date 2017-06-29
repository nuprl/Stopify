/**
 * Plugin to transform function applications into `apply` calls and define
 * `apply` at the top-level as stoppable.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import {Administrative, Call, Apply, Direct} from '../common/helpers';

type Args = t.Expression | t.SpreadElement;
type TApply = 'direct' | 'administrative' | 'call' | 'apply';

const counter: t.Identifier = t.identifier('$counter');
const interval: t.Identifier = t.identifier('$interval');
const onStop: t.Identifier = t.identifier('$onStop');
const isStop: t.Identifier = t.identifier('$isStop');
const setTimeoutId: t.Identifier = t.identifier('setTimeout');

function isTransformed(f: t.Expression): t.MemberExpression {
  return t.memberExpression(f, t.identifier('$isTransformed'));
}

function inlineDirect(callee: t.Expression,
  args: Args[]): t.ConditionalExpression {
    const [k, ek, ...tl] = args;
    return t.conditionalExpression(isTransformed(callee),
      t.callExpression(callee, args),
      t.callExpression(<t.Expression>k, [t.callExpression(callee, tl)]));
  }

function inlineAdmin(callee: t.Expression,
  args: Args[]): t.ConditionalExpression {
    const [k, ek, ...tl] = args;
    return t.conditionalExpression(isTransformed(callee),
      t.callExpression(callee, args),
      t.callExpression(<t.Expression>k, [t.callExpression(callee, tl)]));
  }

function inlineCall(callee: t.Expression,
  args: Args[]): t.ConditionalExpression {
    const [k, ek, ...tl] = args;
    return t.conditionalExpression(isTransformed(callee),
      t.callExpression(callee, args),
      t.callExpression(<t.Expression>k, [t.callExpression(callee, tl)]));
  }

function inlineApply(callee: t.Expression,
  args: Args[]): t.ConditionalExpression {
    const [k, ek, ...tl] = args;
    return t.conditionalExpression(isTransformed(callee),
      t.callExpression(callee, args),
      t.callExpression(<t.Expression>k, [t.callExpression(callee, tl)]));
  }

function inline(applyType: TApply,
  callee: t.Expression,
  args: Args[]): t.Expression[] {
    const [k, ek, ...tl] = args;

    let inlineT;
    switch (applyType) {
      case 'direct':
        inlineT = inlineDirect;
        break;
      case 'administrative':
        inlineT = inlineAdmin;
        break;
      case 'call':
        inlineT = inlineCall;
        break;
      case 'apply':
        inlineT = inlineApply;
        break;
    }
    return [
      t.conditionalExpression(t.binaryExpression('===',
        t.updateExpression('--', counter),
        t.numericLiteral(0)),
        t.sequenceExpression([
          t.assignmentExpression('=', counter, interval),
          t.callExpression(setTimeoutId, [
            t.arrowFunctionExpression([t.identifier('_')],
              t.conditionalExpression(t.callExpression(isStop, []),
                t.callExpression(onStop, []),
                inlineT!(callee, args))),
            t.numericLiteral(0)
          ])
        ]),
        inlineT!(callee, args)),
      t.identifier('e'),
      t.callExpression(<t.Expression>ek, [t.identifier('e')])
    ]
  }

function tryCatch(success: t.Expression,
  error: t.Expression,
  failure: t.Expression): t.Statement {
    return t.tryStatement(t.blockStatement([t.returnStatement(success)]),
      t.catchClause(<t.Identifier>error,
        t.blockStatement([t.returnStatement(failure)])));
  }

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
      } else if ((<Direct<C>>path.node).isDirect !== undefined) {
        return;
      } else {
        const returnPath = <NodePath<t.ReturnStatement>>(path.getStatementParent());
        if (!t.isReturnStatement(returnPath.node)) {
          throw new Error(`CPS produced non-tailcall`);
        }

        const [success, e, failure] =
          inline('direct', path.node.callee, path.node.arguments);
        returnPath.replaceWith(tryCatch(success, e, failure));
        returnPath.skip();
        return;
      }
      const applyArgs = [path.node.callee, ...path.node.arguments];
      path.node.callee = applyId;
      path.node.arguments = applyArgs;
    }
}

module.exports = function() {
    return { visitor: stopApplyVisitor };
};
