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
type InlinedResult = {
  inlined: t.Expression,
  ek?: t.Identifier
};

const counter: t.Identifier = t.identifier('$counter');
const interval: t.Identifier = t.identifier('$interval');
const onStop: t.Identifier = t.identifier('$onStop');
const isStop: t.Identifier = t.identifier('$isStop');
const callId: t.Identifier = t.identifier('call');
const applyId: t.Identifier = t.identifier('apply');
const setTimeoutId: t.Identifier = t.identifier('setTimeout');
const topLevel = t.identifier('$topLevelEk');

function isTransformed(f: t.Expression): t.MemberExpression {
  return t.memberExpression(f, t.identifier('$isTransformed'));
}

function inlineDirect(callee: t.Expression,
  args: Args[]): InlinedResult {
    const [k, ek, ...tl] = args;
    return {
      inlined: t.conditionalExpression(isTransformed(callee),
        t.callExpression(callee, args),
        t.callExpression(<t.Expression>k, [t.callExpression(callee, tl)])),
      ek: <t.Identifier>ek
    };
  }

function inlineAdmin(callee: t.Expression,
  args: Args[]): InlinedResult {
    return {
      inlined: t.callExpression(callee, args)
    }
  }

function inlineCall(callee: t.Expression,
  args: Args[]): InlinedResult {
    const [k, ek, hd, ...tl] = args;
    return {
      inlined: t.conditionalExpression(isTransformed(callee),
        t.callExpression(t.memberExpression(callee, callId), [hd, k, ek, ...tl]),
        t.callExpression(<t.Expression>k,
          [t.callExpression(t.memberExpression(callee, callId), [hd, ...tl])])),
      ek: <t.Identifier>ek
    };
  }

function inlineApply(callee: t.Expression,
  args: Args[]): InlinedResult {
    const [k, ek, thisArg, tl] = args;
    return {
      inlined: t.conditionalExpression(isTransformed(callee),
        t.callExpression(t.memberExpression(callee, applyId),
          [thisArg, t.arrayExpression([k, ek, t.spreadElement(<t.Expression>tl)])]),
        t.callExpression(<t.Expression>k,
          [t.callExpression(t.memberExpression(callee, applyId),
            [thisArg, tl])])),
      ek: <t.Identifier>ek
    };
  }

function inline(call: t.Expression): t.ConditionalExpression {
    return t.conditionalExpression(t.binaryExpression('===',
      t.updateExpression('--', counter),
      t.numericLiteral(0)),
      t.sequenceExpression([
        t.assignmentExpression('=', counter, interval),
        t.callExpression(setTimeoutId, [
          t.arrowFunctionExpression([t.identifier('_')],
            t.conditionalExpression(t.callExpression(isStop, []),
              t.callExpression(onStop, []),
              call)),
          t.numericLiteral(0)
        ])
      ]),
      call);
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
      const returnPath = <NodePath<t.ReturnStatement>>(path.getStatementParent());

      type C = t.CallExpression;
      if ((<Administrative<C>>path.node).isAdmin !== undefined) {
        const { inlined } =
          inlineAdmin(path.node.callee, path.node.arguments);
        if (!t.isReturnStatement(returnPath.node)) {
          returnPath.replaceWith(inline(inlined));
        } else {
          returnPath.replaceWith(t.returnStatement(inline(inlined)));
        }
        returnPath.skip();
        return;
      } else if ((<Call<C>>path.node).isCall !== undefined) {
        const { inlined, ek } =
          inlineCall(path.node.callee, path.node.arguments);
        returnPath.replaceWith(t.returnStatement(t.sequenceExpression([
          t.assignmentExpression('=',
            topLevel, ek),
          inline(inlined)
        ])));
        returnPath.skip();
        return;
      } else if ((<Apply<C>>path.node).isApply !== undefined) {
        const { inlined, ek } =
          inlineApply(path.node.callee, path.node.arguments);
        returnPath.replaceWith(t.returnStatement(t.sequenceExpression([
          t.assignmentExpression('=',
            topLevel, ek),
          inline(inlined)
        ])));
        returnPath.skip();
        return;
      } else if ((<Direct<C>>path.node).isDirect !== undefined) {
        return;
      } else {
        const { inlined, ek } =
          inlineDirect(path.node.callee, path.node.arguments);
        returnPath.replaceWith(t.returnStatement(t.sequenceExpression([
          t.assignmentExpression('=',
            topLevel, ek),
          inline(inlined)
        ])));
        returnPath.skip();
        return;
      }
    }
}

module.exports = function() {
    return { visitor: stopApplyVisitor };
};
