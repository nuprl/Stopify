import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import * as assert from 'assert';
import * as bh from '../babelHelpers';
import * as fastFreshId from '../fastFreshId';
import * as generic from '../generic';
import { getLabels, AppType } from './label';
import * as imm from 'immutable';
import { CompilerOpts } from '../types';
import { box } from './boxAssignables';

type FunctionT = (t.FunctionExpression | t.FunctionDeclaration) & {
  localVars: t.Identifier[]
};

type Labeled<T> = T & {
  labels?: number[];
  appType?: AppType;
  __usesArgs__?: boolean
}
type CaptureFun = (path: NodePath<t.AssignmentExpression>) => void;

interface State {
  opts: CompilerOpts
}

const captureLogics: { [key: string]: CaptureFun } = {
  lazy: lazyCaptureLogic,
  eager: eagerCaptureLogic,
  retval: retvalCaptureLogic,
  fudge: fudgeCaptureLogic,
};

function isFlat(path: NodePath<t.Node>): boolean {
  return (<any>path.getFunctionParent().node).mark === 'Flat'
}


const target = t.identifier('target');
const newTarget = t.identifier('newTarget');
const captureLocals = t.identifier('captureLocals');
export const restoreNextFrame = t.identifier('restoreNextFrame');
const captureFrameId = t.identifier('frame');
const runtime = t.identifier('$__R');
const types = t.identifier('$__T');
const matArgs = t.identifier('materializedArguments');
const argsLen = t.identifier('argsLen');
const runtimeModeKind = t.memberExpression(runtime, t.identifier('mode'));
const runtimeStack = t.memberExpression(runtime, t.identifier('stack'));
const eagerStack = t.memberExpression(runtime, t.identifier('eagerStack'));
const topOfRuntimeStack = t.memberExpression(runtimeStack,
  t.binaryExpression("-", t.memberExpression(runtimeStack, t.identifier("length")), t.numericLiteral(1)), true);
const popRuntimeStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('pop')), []);
const pushEagerStack = t.memberExpression(eagerStack, t.identifier('unshift'));
const shiftEagerStack = t.memberExpression(eagerStack, t.identifier('shift'));
const captureExn = t.memberExpression(types, t.identifier('Capture'));
const restoreExn = t.memberExpression(types, t.identifier('Restore'));
const isNormalMode = runtimeModeKind;
const isRestoringMode = t.unaryExpression('!', runtimeModeKind);

const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

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


function func(path: NodePath<Labeled<FunctionT>>, state: State): void {
  const jsArgs = state.opts.jsArgs;
  if ((<any>path.node).mark === 'Flat') {
    return;
  }
  const restoreLocals = path.node.localVars;

  const restoreBlock = t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.arrayPattern(restoreLocals), t.memberExpression(topOfRuntimeStack,
        t.identifier('locals')))),
    path.node.__usesArgs__ && state.opts.jsArgs === 'full' ?
    t.expressionStatement(t.assignmentExpression('=',
      t.arrayPattern((<any>path.node.params)), t.memberExpression(topOfRuntimeStack,
        t.identifier('formals')))) :
    t.emptyStatement(),
    path.node.__usesArgs__ && state.opts.jsArgs === 'full' ?
    t.expressionStatement(t.assignmentExpression('=',
      argsLen, t.memberExpression(topOfRuntimeStack, argsLen))) :
    t.emptyStatement(),
    t.expressionStatement(t.assignmentExpression('=', target,
      t.memberExpression(topOfRuntimeStack, t.identifier('index')))),
    t.expressionStatement(popRuntimeStack)
  ]);
  const ifRestoring = t.ifStatement(isRestoringMode, restoreBlock);

  const captureBody = t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(captureFrameId, t.identifier('locals')),
      t.arrayExpression(restoreLocals))),
    path.node.__usesArgs__ && state.opts.jsArgs === 'full' ?
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(captureFrameId, t.identifier('formals')),
      t.arrayExpression((<any>path.node.params)))) :
    t.emptyStatement(),
    path.node.__usesArgs__ && state.opts.jsArgs === 'full' ?
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(captureFrameId, argsLen),
      argsLen)) :
    t.emptyStatement(),
  ]);
  const captureClosure = t.functionDeclaration(captureLocals,
    [captureFrameId], captureBody);

  // A local function to restore the next stack frame
  const reenterExpr = path.node.__usesArgs__
    ? t.callExpression(t.memberExpression(path.node.id, t.identifier('apply')),
        [t.thisExpression(), matArgs])
    : t.callExpression(t.memberExpression(path.node.id, t.identifier('call')),
      [t.thisExpression(), ...<any>path.node.params]);
  const reenterClosure = t.variableDeclaration('var', [
    t.variableDeclarator(restoreNextFrame, t.arrowFunctionExpression([],
      t.blockStatement(path.node.__usesArgs__ ?
        [t.expressionStatement(t.assignmentExpression('=',
          t.memberExpression(matArgs, t.identifier('length')),
          t.memberExpression(t.callExpression(t.memberExpression(t.identifier('Object'),
            t.identifier('keys')), [matArgs]), t.identifier('length')))),
          t.returnStatement(reenterExpr)] :
        [t.returnStatement(reenterExpr)])))]);

  const mayMatArgs: t.Statement[] = [];
  if (path.node.__usesArgs__) {
    const argExpr = jsArgs === 'faithful' || jsArgs === 'full'
      ? bh.arrayPrototypeSliceCall(t.identifier('arguments'))
      : t.identifier('arguments');

    mayMatArgs.push(
      t.variableDeclaration('const',
        [t.variableDeclarator(matArgs, argExpr)]));

    const boxedArgs = <imm.Set<string>>(<any>path.node).boxedArgs;

    if (jsArgs === 'faithful' || jsArgs === 'full') {
      const initMatArgs: t.Statement[] = [];
      (<t.Identifier[]>path.node.params).forEach((x, i) => {
        if (boxedArgs.contains(x.name)) {
          const cons =  t.assignmentExpression('=',
            t.memberExpression(matArgs, t.numericLiteral(i), true),
            box(t.identifier(x.name)));
            initMatArgs.push(t.expressionStatement(cons));
        }
      });
      mayMatArgs.push(bh.sIf(isNormalMode, t.blockStatement(initMatArgs)));
    }
  }

  path.node.body.body.unshift(...[
    t.variableDeclaration('let',
      [t.variableDeclarator(argsLen,
        t.memberExpression(t.identifier('arguments'), t.identifier('length')))]),
    ifRestoring,
    captureClosure,
    reenterClosure,
    ...mayMatArgs
  ]);
  path.skip();
};

function labelsIncludeTarget(labels: number[]): t.Expression {
  return labels.reduce((acc: t.Expression, lbl) =>
    bh.or(t.binaryExpression('===',  target, t.numericLiteral(lbl)), acc),
    bh.eFalse);
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

  const nodeStmt = t.expressionStatement(path.node);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall)
  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([nodeStmt]),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(restoreNode)));

  const exnStack = t.memberExpression(exn, t.identifier('stack'));

  const tryStmt = t.tryStatement(t.blockStatement([ifStmt]),
    t.catchClause(exn, t.blockStatement([
      t.ifStatement(t.binaryExpression('instanceof', exn, captureExn),
        t.blockStatement([
          t.expressionStatement(t.callExpression(t.memberExpression(exnStack, t.identifier('push')), [
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
              t.objectProperty(t.identifier('f'), restoreNextFrame),
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
  const nodeStmt = t.expressionStatement(path.node);

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(t.identifier('f'), restoreNextFrame),
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
  const left: any = path.node.left;

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(t.identifier('f'), restoreNextFrame),
    t.objectProperty(t.identifier('index'), applyLbl),
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

function isNormalGuarded(stmt: t.Statement): stmt is t.IfStatement {
  return (t.isIfStatement(stmt) &&
    stmt.test === isNormalMode &&
    stmt.alternate === null);
}

const jumper = {
  Identifier: function (path: NodePath<t.Identifier>, s: State): void {
    if (s.opts.jsArgs === 'full' && path.node.name === 'arguments' &&
      (t.isMemberExpression(path.parent) &&
        path.parent.property.type === 'Identifier' &&
        path.parent.property.name === 'length')) {
      path.parentPath.replaceWith(argsLen);
    } else if (s.opts.jsArgs === 'full' && path.node.name === 'arguments') {
      path.node.name = 'materializedArguments';
    }
  },

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
    },
    exit(path: NodePath<Labeled<FunctionT>>, state: State): void {
      if((<any>path.node).mark == 'Flat') {
        return
      }

      func(path, state);

      const declTarget = bh.varDecl(target, t.nullLiteral());
      (<any>declTarget).lifted = true;
      path.node.body.body.unshift(declTarget);

      if (state.opts.newMethod === 'direct') {
        path.node.localVars.push(newTarget);
        const declNewTarget = bh.varDecl(newTarget,
          t.memberExpression(t.identifier('new'), t.identifier('target')));
        (<any>declNewTarget).lifted = true;

        path.node.body.body.unshift(declNewTarget);

        const ifConstructor = bh.sIf(newTarget,
          t.returnStatement(t.thisExpression()));
        (<any>ifConstructor).isTransformed = true;

        path.node.body.body.push(ifConstructor);
      }
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

      const alternateCond = bh.or(
        isNormalMode,
        bh.and(isRestoringMode,
               labelsIncludeTarget(getLabels(alternate))));

      const newAlt = alternate === null ? alternate :
      t.ifStatement(alternateCond, alternate);

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

export function plugin(): any {
  return { visitor: jumper };
}
