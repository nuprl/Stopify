import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import { fresh } from '@stopify/hygiene';
import * as bh from '@stopify/util';
import * as h from '../helpers';
import { getLabels } from './label';
import { CompilerOpts } from '../types';

export {
  isNormalMode,
  captureExn,
  captureLocals,
  target,
  restoreNextFrame,
  stackFrameCall,
  runtime,
  topOfRuntimeStack,
  runtimeStack,
  types,
};

export {
  lazyCaptureLogic,
  lazyGlobalCatch,
  eagerCaptureLogic,
  retvalCaptureLogic,
  fudgeCaptureLogic
};

const types = t.identifier('$__T');
const restoreNextFrame = t.identifier('restoreNextFrame');
const target = t.identifier('target');
const captureLocals = t.identifier('captureLocals');
const runtime = t.identifier('$__R');
const runtimeStack = t.memberExpression(runtime, t.identifier('stack'));
const captureExn = t.memberExpression(types, t.identifier('Capture'));
export const endTurnExn = t.memberExpression(types, t.identifier('EndTurn'));
const isNormalMode = t.memberExpression(runtime, t.identifier('mode'));
const topOfRuntimeStack = t.memberExpression(runtimeStack,
  t.binaryExpression("-", t.memberExpression(runtimeStack, t.identifier("length")), t.numericLiteral(1)), true);
const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

const eagerStack = t.memberExpression(runtime, t.identifier('eagerStack'));
const shiftEagerStack = t.memberExpression(eagerStack, t.identifier('shift'));
const pushEagerStack = t.memberExpression(eagerStack, t.identifier('unshift'));

/**
 * Wrap callsites in try/catch block, lazily building the stack on catching a
 * Capture exception, then rethrowing.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    try {
 *      if (mode === 'normal') {
 *        x = f_n(...args);
 *      } else if (mode === restoring && target === n) {
 *        x = R.stack[R.stack.length-1].f();
 *      }
 *    } catch (exn) {
 *      if (exn instanceof Capture) {
 *        exn.stack.push(stackFrame);
 *      }
 *      throw exn;
 *    }
 */
function lazyCaptureLogic(path: NodePath<t.AssignmentExpression>,
  opts: CompilerOpts): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const exn = fresh('exn');

  const nodeStmt = t.expressionStatement(path.node);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall);
  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([nodeStmt]),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(restoreNode)));

  const exnStack = t.memberExpression(exn, t.identifier('stack'));

  // A small hack to avoid showing reporting $top as the function name for
  // top-level function calls
  let funName = bh.enclosingFunctionName(path);
  if (funName === '$top') {
    funName = undefined;
  }

  const tryStmt = t.tryStatement(t.blockStatement([ifStmt]),
    t.catchClause(exn, t.blockStatement([
      t.ifStatement(t.binaryExpression('instanceof', exn, captureExn),
        t.blockStatement([
          t.expressionStatement(t.callExpression(t.memberExpression(exnStack, t.identifier('push')), [
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
              t.objectProperty(t.identifier('f'), restoreNextFrame),
              t.objectProperty(t.identifier('index'), applyLbl),
              t.objectProperty(t.identifier('this'), t.thisExpression()),
            ]),
          ])),
          t.expressionStatement(t.callExpression(captureLocals, [
            t.memberExpression(exnStack, t.binaryExpression('-',
              t.memberExpression(exnStack, t.identifier('length')),
              t.numericLiteral(1)), true)
          ])),
        ]),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(runtime, t.identifier('pushTrace')),
              [t.stringLiteral(h.locationString(funName, path, opts))]))
        ])),
      t.throwStatement(exn)
    ])));

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(tryStmt);
  stmtParent.skip();
}

function lazyGlobalCatch(path: NodePath<t.AssignmentExpression>,
  opts: CompilerOpts): void {
    const applyLbl = t.numericLiteral(getLabels(path.node)[0]);

    const nodeStmt = t.expressionStatement(path.node);

    const restoreNode = t.assignmentExpression(path.node.operator,
      path.node.left, t.callExpression(t.memberExpression(t.memberExpression(
        topOfRuntimeStack, t.identifier('f')),
        t.identifier('apply')), [
          t.memberExpression(topOfRuntimeStack, t.identifier('this')),
          t.memberExpression(topOfRuntimeStack, t.identifier('params'))
        ]));

    const ifStmt = t.ifStatement(isNormalMode,
      t.blockStatement([
        t.expressionStatement(t.assignmentExpression('=', target, applyLbl)),
        nodeStmt
      ]),
      t.ifStatement(t.binaryExpression('===', target, applyLbl),
        t.expressionStatement(restoreNode)));

    const stmtParent = path.getStatementParent();
    stmtParent.replaceWith(ifStmt);
    stmtParent.skip();
  }

/**
 * Eagerly build the stack, pushing frames before applications and popping on
 * their return. Capture exns are thrown straight to the runtime, passing the
 * eagerly built stack along with it.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    if (mode === 'normal') {
 *      eagerStack.unshift(stackFrame);
 *      x = f_n(...args);
 *      eagerStack.shift();
 *    } else if (mode === 'restoring' && target === n) {
 *      // Don't have to `unshift` to rebuild stack because the eagerStack is
 *      // preserved from when the Capture exn was thrown.
 *      x = R.stack[R.stack.length-1].f();
 *      eagerStack.shift();
 *    }
 */
function eagerCaptureLogic(path: NodePath<t.AssignmentExpression>,
  opts: CompilerOpts): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const nodeStmt = t.expressionStatement(path.node);

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(t.identifier('f'), restoreNextFrame),
    t.objectProperty(t.identifier('index'), applyLbl),
    t.objectProperty(t.identifier('this'), t.thisExpression()),
  ]);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall);
  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([
      t.expressionStatement(t.callExpression(pushEagerStack, [
        stackFrame,
      ])),
      t.expressionStatement(t.callExpression(captureLocals, [
        t.memberExpression(eagerStack, t.numericLiteral(0), true),
      ])),
      nodeStmt,
      t.expressionStatement(t.callExpression(shiftEagerStack, [])),
    ]),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.blockStatement([
        t.expressionStatement(restoreNode),
        t.expressionStatement(t.callExpression(shiftEagerStack, [])),
      ])));
  (<any>ifStmt).isTransformed = true;

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(ifStmt);
  stmtParent.skip();
}

/**
 * Special return-value to conditionally capture stack frames and propogate
 * returns up to the runtime.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    {
 *      let ret;
 *      if (mode === 'normal') {
 *        ret = f_n(...args);
 *      } else if (mode === 'restoring' && target === n) {
 *        ret = R.stack[R.stack.length-1].f();
 *      }
 *      if (ret instanceof Capture) {
 *        ret.stack.push(stackFrame);
 *        return ret;
 *      }
 *      if (mode === 'normal') x = ret;
 *    }
 */
function retvalCaptureLogic(path: NodePath<t.AssignmentExpression>,
  opts: CompilerOpts): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const left: any = path.node.left;

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(t.identifier('f'), restoreNextFrame),
    t.objectProperty(t.identifier('index'), applyLbl),
    t.objectProperty(t.identifier('this'), t.thisExpression()),
  ]);

  const retStack = t.memberExpression(left, t.identifier('stack'));
  const restoreBlock: t.IfStatement =
  t.ifStatement(t.binaryExpression('instanceof', left, captureExn),
    t.blockStatement([
      t.expressionStatement(t.callExpression(
        t.memberExpression(retStack, t.identifier('push')), [
            stackFrame,
          ])),
      t.expressionStatement(t.callExpression(captureLocals, [
        t.memberExpression(retStack, t.binaryExpression('-',
          t.memberExpression(retStack, t.identifier('length')),
          t.numericLiteral(1)), true)
      ])),
      t.returnStatement(left),
    ]));

  const ifStmt = t.ifStatement(
    isNormalMode,
    t.expressionStatement(path.node),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(t.assignmentExpression('=',
        left, stackFrameCall))));

  const replace = t.ifStatement(
    bh.or(isNormalMode, t.binaryExpression('===', target, applyLbl)),
    t.blockStatement([
      ifStmt,
      restoreBlock,
    ]));
  (<any>replace).isTransformed = true;

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(replace);
  stmtParent.skip();
}

function fudgeCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  return;
}
