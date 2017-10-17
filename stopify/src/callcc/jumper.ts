import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as assert from 'assert';
import * as bh from '../babelHelpers';
import { letExpression } from '../common/helpers';
import * as fastFreshId from '../fastFreshId';
import * as generic from '../generic';
import { getLabels, AppType } from './label';

type FunctionT = (t.FunctionExpression | t.FunctionDeclaration) & {
  localVars: t.Identifier[]
};

type Labeled<T> = T & {
  labels?: number[];
  appType?: AppType;
  __usesArgs__?: boolean
}
type CaptureFun = (path: NodePath<t.AssignmentExpression>) => void;

export type CaptureLogic = 'lazy' | 'eager' | 'retval' | 'fudge';
export type NewMethod = 'direct' | 'wrapper';

interface State {
  opts: {
    captureMethod: CaptureLogic,
    handleNew: NewMethod,
    compileFunction: boolean
  };
}

const captureLogics: { [key: string]: CaptureFun } = {
  lazy: lazyCaptureLogic,
  eager: eagerCaptureLogic,
  retval: retvalCaptureLogic,
  fudge: fudgeCaptureLogic,
};

function split<T>(arr: T[], index: number): { pre: T[], post: T[] } {
  return {
    pre: arr.slice(0, index),
    post: arr.slice(index, arr.length),
  };
}

function isFlat(path: NodePath<t.Node>): boolean {
  return (<any>path.getFunctionParent().node).mark === 'Flat'
}


const target = t.identifier('target');
const newTarget = t.identifier('newTarget');
const captureLocals = t.identifier('captureLocals');
const captureFrameId = t.identifier('frame');
const runtime = t.identifier('$__R');
const types = t.identifier('$__T');
const matArgs = t.identifier('materializedArguments');
const runtimeModeKind = t.memberExpression(runtime, t.identifier('mode'));
const runtimeStack = t.memberExpression(runtime, t.identifier('stack'));
const eagerStack = t.memberExpression(runtime, t.identifier('eagerStack'));
const topOfRuntimeStack = t.memberExpression(runtimeStack,
  t.binaryExpression("-", t.memberExpression(runtimeStack, t.identifier("length")), t.numericLiteral(1)), true);
const popRuntimeStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('pop')), []);
const unshiftRuntimeStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('shift')), [])
const pushRuntimeStack = t.memberExpression(runtimeStack, t.identifier('push'));
const pushEagerStack = t.memberExpression(eagerStack, t.identifier('unshift'));
const shiftEagerStack = t.memberExpression(eagerStack, t.identifier('shift'));
const captureExn = t.memberExpression(types, t.identifier('Capture'));
const restoreExn = t.memberExpression(types, t.identifier('Restore'));
const isNormalMode = runtimeModeKind;
const isRestoringMode = t.unaryExpression('!', runtimeModeKind);
const $value = t.identifier('$value')
const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

const stackBottom = t.memberExpression(runtimeStack, t.identifier("0"), true)

const isThrowing = t.memberExpression(runtime, t.identifier('throwing'))

function usesArguments(path: NodePath<t.Function>) {
  let r = false;
  const visitor = {
    ReferencedIdentifier(path: NodePath<t.Identifier>) {
      if (path.node.name === 'arguments') {
        r = true;
        path.stop();
      }
    },
    Function(path: NodePath<t.Function>) {
      path.skip();
    }
  };
  path.traverse(visitor);
  return r;
}

function func(path: NodePath<Labeled<FunctionT>>): void {
  if ((<any>path.node).mark === 'Flat') {
    return;
  }
  const { body } = path.node;
  const afterDecls = body.body.findIndex(e =>
   !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(body.body, afterDecls);

  const restoreLocals = path.node.localVars;

  const restoreBlock = t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.arrayPattern(restoreLocals), t.memberExpression(stackBottom,
        t.identifier('locals')))),
    t.expressionStatement(t.assignmentExpression('=', target,
      t.memberExpression(stackBottom, t.identifier('index')))),
    t.expressionStatement(t.assignmentExpression('=', $value,
      t.memberExpression(stackBottom, t.identifier('value')))),
    t.expressionStatement(unshiftRuntimeStack)
  ]);
  const ifRestoring = t.ifStatement(isRestoringMode, restoreBlock);

  const captureBody = t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(captureFrameId, t.identifier('locals')),
      t.arrayExpression(restoreLocals))),
  ]);
  const captureClosure = t.functionDeclaration(captureLocals,
    [captureFrameId], captureBody);

  const mayMatArgs: t.Statement[] = [];
  if (path.node.__usesArgs__) {
    mayMatArgs.push(
      t.variableDeclaration('const',
        [t.variableDeclarator(matArgs, t.identifier('arguments'))]));
  }

  const newBody = t.blockStatement([
    ...pre,
    letExpression($value, t.nullLiteral()),
    ifRestoring,
    captureClosure,
    ...mayMatArgs,
    ...post
  ]);
  newBody.directives = path.node.body.directives;
  path.get('body').replaceWith(newBody);
  path.skip();
};

function labelsIncludeTarget(labels: number[]): t.Expression {
  return labels.reduce((acc: t.Expression, lbl) =>
    bh.or(t.binaryExpression('===',  target, t.numericLiteral(lbl)), acc),
    bh.eFalse);
}

function reapplyExpr(path: NodePath<Labeled<FunctionT>>): t.Expression {
  const funId = path.node.id;
  let reapply: t.Expression;
  if (path.node.__usesArgs__) {
    reapply = t.callExpression(t.memberExpression(funId, t.identifier('apply')),
        [t.thisExpression(), matArgs]);
  }
  else {
    reapply = t.callExpression(t.memberExpression(funId, t.identifier("call")),
        [t.thisExpression(), ...<any>path.node.params]);
  }
  return reapply;
}

function fudgeCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  return;
}

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
function lazyCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const exn = fastFreshId.fresh('exn');

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const nodeStmt = t.expressionStatement(path.node);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, $value)

  const setRestoreMode = t.expressionStatement(
    t.assignmentExpression('=',
      runtimeModeKind,
      t.booleanLiteral(true)))

  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([nodeStmt]),
    t.ifStatement(
      t.logicalExpression('&&',
        t.binaryExpression('===', target, applyLbl),
        isThrowing),
      t.blockStatement([
        setRestoreMode,
        t.expressionStatement(
          t.assignmentExpression('=', isThrowing, t.booleanLiteral(false))),
        t.throwStatement($value)]),
      t.ifStatement(
        t.logicalExpression('&&',
          t.binaryExpression('===', target, applyLbl),
          t.binaryExpression('===', isThrowing, t.booleanLiteral(false))),
        t.blockStatement([
          t.expressionStatement(restoreNode), setRestoreMode]))))

  const exnStack = t.memberExpression(exn, t.identifier('stack'));

  const rFunc = t.functionExpression(
    funId, [], t.blockStatement([t.returnStatement(reapplyExpr(funParent))]))

  const tryStmt = t.tryStatement(t.blockStatement([ifStmt]),
    t.catchClause(exn, t.blockStatement([
      t.ifStatement(t.binaryExpression('instanceof', exn, captureExn),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(t.memberExpression(exnStack, t.identifier('push')), [
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
              t.objectProperty(
                t.identifier('f'),
                t.arrowFunctionExpression([], reapplyExpr(funParent))),
              t.objectProperty(t.identifier('index'), applyLbl),
            ]),
          ])),
          t.expressionStatement(t.callExpression(captureLocals, [
            t.memberExpression(exnStack, t.binaryExpression('-',
              t.memberExpression(exnStack, t.identifier('length')),
              t.numericLiteral(1)), true)
          ])),
        ])),
      t.throwStatement(exn)
    ])));

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(tryStmt);
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
function eagerCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(funBody.body, afterDecls);

  const nodeStmt = t.expressionStatement(path.node);

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(
      t.identifier('f'),
      t.arrowFunctionExpression([], reapplyExpr(funParent))),
    t.objectProperty(t.identifier('index'), applyLbl),
  ]);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall)
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
function retvalCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const ret = fastFreshId.fresh('ret');

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(funBody.body, afterDecls);

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(
      t.identifier('f'),
      t.arrowFunctionExpression([], reapplyExpr(funParent))),
    t.objectProperty(t.identifier('index'), applyLbl),
  ]);

  const retStack = t.memberExpression(ret, t.identifier('stack'));
  const restoreBlock: t.IfStatement =
  t.ifStatement(t.binaryExpression('instanceof', ret, captureExn),
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
      t.returnStatement(ret),
    ]),
    t.ifStatement(t.binaryExpression('instanceof', ret, restoreExn),
      t.returnStatement(ret)));

  const ifStmt = t.ifStatement(
    isNormalMode,
    t.expressionStatement(t.assignmentExpression('=', ret, path.node.right)),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(t.assignmentExpression('=',
        ret, stackFrameCall))));

  const reassign = t.ifStatement(isNormalMode,
    t.expressionStatement(t.assignmentExpression(
      path.node.operator,
      path.node.left, ret)));

  const replace = t.ifStatement(
    bh.or(isNormalMode, t.binaryExpression('===', target, applyLbl)),
    t.blockStatement([
      t.variableDeclaration('let', [t.variableDeclarator(ret)]),
      ifStmt,
      restoreBlock,
      reassign,
    ]));
  (<any>replace).isTransformed = true;

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(replace);
  stmtParent.skip();
}

function isNormalGuarded(stmt: t.Statement): stmt is t.IfStatement {
  return (t.isIfStatement(stmt) &&
    stmt.test === isNormalMode &&
    stmt.alternate === null);
}

const jumper = {
  BlockStatement: {
    exit(path: NodePath<Labeled<t.BlockStatement>>) {
      const stmts = path.node.body;
      if (stmts.length === 1) {
        return;
      }
      const blocks = generic.groupBy((x,y) =>
        isNormalGuarded(x) && isNormalGuarded(y), stmts);
      const result: t.Statement[] = [];
      for (const block of blocks) {
        if (block.length === 1) {
          result.push(block[0]);
        }
        else {
          block.forEach((stmt) => {
            assert((<t.IfStatement>stmt).test === isNormalMode);
          })
          result.push(
            bh.sIf(isNormalMode,
              t.blockStatement(block.map((stmt) =>(<t.IfStatement>stmt)
                .consequent))));
        }
      }

      path.node.body = result;
    }
  },
  ExpressionStatement: {
    exit(path: NodePath<Labeled<t.ExpressionStatement>>, s: State) {
      if (isFlat(path)) return
      if (path.node.appType !== undefined &&
        path.node.appType >= AppType.Tail) {

        // Skip if the right hand-side is a flat call
        if (path.node.expression.type === 'AssignmentExpression' &&
          (<any>path.node.expression.right).mark === 'Flat') {
          // Do Nothing
        }
        else {
          captureLogics[s.opts.captureMethod](
            <any>path.get('expression'));
          return;
        }
      }

      path.replaceWith(t.ifStatement(isNormalMode, path.node));
      path.skip();
    }
  },

  "FunctionExpression|FunctionDeclaration": {
    enter(path: NodePath<Labeled<FunctionT>>, s: State) {
      path.node.__usesArgs__ = usesArguments(path);

      if ((<any>path.node).mark === 'Flat') {
        return;
      }

      const declTarget = letExpression(target, t.nullLiteral());
      (<any>declTarget).lifted = true;

      if (s.opts.handleNew === 'direct') {
        path.node.localVars.push(newTarget);
        const declNewTarget = letExpression(newTarget,
          t.memberExpression(t.identifier('new'), t.identifier('target')));
        (<any>declNewTarget).lifted = true;

        path.node.body.body.unshift(declTarget);
        path.node.body.body.unshift(declNewTarget);

        const ifConstructor = bh.sIf(newTarget,
          t.returnStatement(t.thisExpression()));
        (<any>ifConstructor).isTransformed = true;

        path.node.body.body.push(ifConstructor);
      }
    },
    exit(path: NodePath<Labeled<FunctionT>>): void {
      if((<any>path.node).mark == 'Flat') {
        return
      }
      else return func(path);
    }
  },

  WhileStatement: function (path: NodePath<Labeled<t.WhileStatement>>): void {
    // No need for isFlat check here. Loops make functions not flat.
    path.node.test = bh.or(
      bh.and(isRestoringMode, labelsIncludeTarget(getLabels(path.node))),
      bh.and(isNormalMode, path.node.test));
  },

  IfStatement: {
    exit(path: NodePath<Labeled<t.IfStatement>>): void {
      if ((<any>path.node).isTransformed || isFlat(path)) {
        return;
      }
      const { test, consequent, alternate } = path.node;

      const alternateLabels = getLabels(alternate);
      const alternateCond = bh.or(
        isNormalMode,
        bh.and(isRestoringMode,
               labelsIncludeTarget(getLabels(alternate))));

      const newAlt = alternate === null ? alternate :
      t.ifStatement(alternateCond, alternate);

      const consequentLabels = getLabels(consequent);
      const consequentCond = bh.or(
        bh.and(isNormalMode, test),
        bh.and(isRestoringMode, labelsIncludeTarget(getLabels(consequent))));

      const newIf = t.ifStatement(consequentCond, consequent, newAlt);
      path.replaceWith(newIf);
      path.skip();
    },
  },

  ReturnStatement: {
    exit(path: NodePath<Labeled<t.ReturnStatement>>, s: State): void {
      if (path.node.appType !== AppType.Mixed) {
        return;
      }

      // Labels may occur if this return statement occurs in a try block.
      const labels = getLabels(path.node);
      const ifReturn = t.ifStatement(
        isNormalMode,
        path.node,
        bh.sIf(bh.and(isRestoringMode, labelsIncludeTarget(labels)),
          t.returnStatement(stackFrameCall)));
      path.replaceWith(ifReturn);
      path.skip();
    }
  },

  CatchClause: {
    exit(path: NodePath<t.CatchClause>, s: State): void {
      if (s.opts.captureMethod === 'retval' || isFlat(path)) {
        return;
      }
      const { param, body } = path.node;
      body.body.unshift(t.ifStatement(
        bh.or(
          t.binaryExpression('instanceof', param, captureExn),
          t.binaryExpression('instanceof', param, restoreExn)),
        t.throwStatement(param)));
      path.skip();
    }
  },

  TryStatement: {
    exit(path: NodePath<t.TryStatement>) {
      // To understand what's happening here, see jumperizeTry.ts
      if (path.node.handler) {
        path.node.block.body.unshift(
          bh.sIf(bh.and(isRestoringMode,
            labelsIncludeTarget(getLabels(path.node.handler.body))),
            t.throwStatement(<t.Identifier>(<any>path.node.handler).eVar)));
      }
      if (path.node.finalizer) {
        path.node.finalizer = t.blockStatement([
          bh.sIf(t.unaryExpression('!',
            t.memberExpression(runtime, t.identifier('capturing'))),
            path.node.finalizer)]);
      }
    }
  }
};

module.exports = function () {
  return { visitor: jumper };
}
