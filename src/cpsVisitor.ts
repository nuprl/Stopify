/**
 * Plugin to transform JS programs into CPS form.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

type Function = t.FunctionDeclaration | t.FunctionExpression;
interface ReturnStatement extends t.ReturnStatement {
  kArg: t.Expression;
};
type CPS<T> = T & {
  cps?: boolean;
};

// Hack to avoid applying visitors to newly constructed nodes.
function isCPS(node: CPS<t.Node>): boolean {
  return node.cps;
}

// TODO: fix any cast on headK/tailK identifiers.
function createTailFunction(tailPath: NodePath<t.Node>,
  tail: t.Statement[],
  headK: any,
  tailK: any): t.FunctionExpression {
    const newTail = foldSequence(tailPath, tail);
    const tailCall : CPS<t.CallExpression> = t.callExpression(newTail, [headK]);
    tailCall.cps = true;
    const tailReturn : CPS<t.ReturnStatement> = t.returnStatement(tailCall);
    tailReturn.cps = true;
    const tailBody : CPS<t.BlockStatement> = t.blockStatement([tailReturn]);
    tailBody.cps = true;
    const tailFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [tailK], tailBody);
    tailFunction.cps = true;
    return tailFunction;
  }

// TODO: fix any cast on headK identifier.
function createHeadFunction(head: t.Expression,
  headK: any,
  ...headCallArgs: Array<t.Expression|t.SpreadElement>): t.FunctionExpression {
    const headCall : CPS<t.CallExpression> = t.callExpression(head, [...headCallArgs]);
    headCall.cps = true;
    const headReturn : CPS<t.ReturnStatement> = t.returnStatement(headCall);
    headReturn.cps = true;
    const headBody : CPS<t.BlockStatement> = t.blockStatement([headReturn]);
    headBody.cps = true;
    const headFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [headK], headBody);
    headFunction.cps = true;
    return headFunction;
  }

function foldSequence(path: NodePath<t.Node>, statements: Array<t.Statement>): t.FunctionExpression {
  let tailPath = path.getSibling('1');
  const [head, ...tail] = statements;
  const headK = path.scope.generateUidIdentifier('k');
  const tailK = path.scope.generateUidIdentifier('k');
  if (head === undefined) {
    const k : any = path.scope.generateUidIdentifier('k');
    const kCall : CPS<t.CallExpression> = t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]);
    kCall.cps = true;
    const kReturn : CPS<t.ReturnStatement> = t.returnStatement(kCall);
    kReturn.cps = true;
    const kBody : CPS<t.BlockStatement> = t.blockStatement([kReturn]);
    kBody.cps = true;
    const kFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], kBody);
    kFunction.cps = true;
    return kFunction;
  } else {
    switch (head.type) {
      case 'ExpressionStatement': {
        tailPath = tailPath.scope === null ? path : tailPath;
        const tailFunction = createTailFunction(tailPath, tail, headK, tailK);
        const headFunction = createHeadFunction(head.expression, headK, tailFunction);
        return headFunction;
      } case 'VariableDeclaration': {
        const { declarations } = head;
        const { id, init } = declarations[0];
        if (t.isCallExpression(init)) {
          const tailFunction = createTailFunction(tailPath, tail, headK, id);
          let args = init.arguments;
          if (t.isIdentifier(init.callee) && path.scope.hasBinding(init.callee.name)) {
            args = [tailFunction, ...args];
          }
          const headFunction = createHeadFunction(init.callee, headK, ...args);
          return headFunction;
        } else {
          const k : any = path.scope.generateUidIdentifier('k');
          const kCall : CPS<t.CallExpression> = t.callExpression(k, <any[]>[id]);
          kCall.cps = true;
          const kReturn : CPS<t.ReturnStatement> = t.returnStatement(kCall);
          kReturn.cps = true;
          const kBody : CPS<t.BlockStatement> = t.blockStatement([head, kReturn]);
          kBody.cps = true;
          const expFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], kBody);
          expFunction.cps = true;

          const tailFunction = createTailFunction(tailPath, tail, headK, id);
          const headFunction = createHeadFunction(expFunction, headK, tailFunction);
          return headFunction;
        }
      } case 'FunctionDeclaration': {
        const k : any = path.scope.generateUidIdentifier('k');
        const kCall : CPS<t.CallExpression> = t.callExpression(k, [head.id]);
        kCall.cps = true;
        const kReturn : CPS<t.ReturnStatement> = t.returnStatement(kCall);
        kReturn.cps = true;
        const kBody : CPS<t.BlockStatement> = t.blockStatement([head, kReturn]);
        kBody.cps = true;
        const expFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], kBody);
        expFunction.cps = true;

        const tailFunction = createTailFunction(tailPath, tail, headK, head.id);
        const headFunction = createHeadFunction(expFunction, headK, tailFunction);
        return headFunction;
      } default: {
        tailPath = tailPath.scope === null ? path : tailPath;
        const tailFunction = createTailFunction(tailPath, tail, headK, tailK);

        const k : any = path.scope.generateUidIdentifier('k');
        const kCall : CPS<t.CallExpression> = t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]);
        kCall.cps = true;
        const kReturn : CPS<t.ReturnStatement> = t.returnStatement(kCall);
        kReturn.cps = true;
        const kBody : CPS<t.BlockStatement> = t.blockStatement(<t.Statement[]>[path.node, kReturn]);
        kBody.cps = true;
        const expFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], kBody);
        expFunction.cps = true;

        return expFunction;
      }
    }
  }
}

const program : VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>): void {
    const { body } = path.node;
    const bodyPath = path.get('body.0');
    const newBody : CPS<t.ExpressionStatement> = t.expressionStatement(foldSequence(bodyPath, body));
    newBody.cps = true;
    path.node.body = [newBody];
  },
};

// Block Statements are visited on exit so that their body is CPS'd.
//
// Transformation:
// CPS [[ [s1; ... ; s2] ]] =>
//   [[ [`foldSequence(p, [s1;...;s2])`] ]]
//
// Assumptions:
//  - `foldSequence` properly chains together continuations generated by
//    variable declarations and applications.
const block : VisitNode<t.BlockStatement> = {
  exit(path: NodePath<t.BlockStatement>): void {
    if (isCPS(path.node)) return;
    const { body } = path.node;

    const bodyPath = path.get('body.0');
    const newBody = foldSequence(bodyPath, body);

    const newBlock : CPS<t.BlockStatement> = t.blockStatement([t.expressionStatement(newBody)]);
    newBlock.cps = true;
    path.node.body = [t.expressionStatement(newBody)];
  },
};

// Return Statements
//
// Transformation:
// CPS [[ return e; ]] =>
//   let k = return continuation;
//   [[ function (k') {
//        return k(e);
//      } ]]
//
// Assumptions:
//  - A prior pass has tagged all return statements with the continuation
//    argument of the appropriate function.
const ret : VisitNode<t.ReturnStatement> =
  function (path: NodePath<ReturnStatement>): void {
    if (isCPS(path.node)) return;

    const k : any = path.scope.generateUidIdentifier('k');
    const returnCall : CPS<t.CallExpression> = t.callExpression(path.node.kArg, [path.node.argument]);
    returnCall.cps = true;
    const newReturn : CPS<t.ReturnStatement> = t.returnStatement(returnCall);
    newReturn.cps = true;
    const returnBody : CPS<t.BlockStatement> = t.blockStatement([newReturn]);
    returnBody.cps = true;
    const returnFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], returnBody);
    returnFunction.cps = true;
    const fExp : CPS<t.ExpressionStatement> = t.expressionStatement(returnFunction);
    fExp.cps = true;

    path.replaceWith(fExp);
  };

// Definitely-Terminating Expression Statements
//
// Transformation:
// CPS [[ m ]] =>
//   [[ function (k) {
//        m;
//        return k(null);
//      } ]]
//
// Assumptions:
//  - Expression Statements don't return any value, so they are run and
//    sequentially followed by the continuation applied to `null`.
const exp : VisitNode<t.ExpressionStatement> =
  function (path: NodePath<CPS<t.ExpressionStatement>>): void {
    if (isCPS(path.node)) return;
    if (t.isFunctionExpression(path.node.expression)) return;

    path.node.cps = true;
    const k : any = path.scope.generateUidIdentifier('k');
    const kCall : CPS<t.CallExpression> = t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]);
    kCall.cps = true;
    const kReturn : CPS<t.ReturnStatement> = t.returnStatement(kCall);
    kReturn.cps = true;
    const kBody : CPS<t.BlockStatement> = t.blockStatement([path.node, kReturn]);
    kBody.cps = true;
    const expFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], kBody);
    expFunction.cps = true;
    const newExp : CPS<t.ExpressionStatement> = t.expressionStatement(expFunction);
    newExp.cps = true;

    path.replaceWith(newExp);
  };


// If Statements are visited on exit so that branches have been CPS'd.
//
// Transformation:
// CPS [[ if (t) { s1 } else { s2 } ]] =>
//   [[ function (k) {
//        if (t) {
//          return `CPS [[ s1 ]]`(k);
//        } else {
//          return `CPS [[ s2 ]]`(k);
//        }
//      } ]]
//
// Assumptions:
//  - Branch block statements consist of a single function expression statement
const ifStatement: VisitNode<t.IfStatement> = {
  exit(path: NodePath<CPS<t.IfStatement>>): void {
    if (isCPS(path.node)) return;
    const { test, consequent, alternate } = path.node;

    path.node.cps = true;
    const k : any = path.scope.generateUidIdentifier('k');
    const trueCall : CPS<t.CallExpression> = t.callExpression((<any>consequent).body[0].expression, [k]);
    trueCall.cps = true;
    const trueReturn : CPS<t.ReturnStatement> = t.returnStatement(trueCall);
    trueReturn.cps = true;
    path.node.consequent = trueReturn;
    if (alternate !== null) {
      const falseCall : CPS<t.CallExpression> = t.callExpression((<any>alternate).body[0].expression, [k]);
      falseCall.cps = true;
      const falseReturn : CPS<t.ReturnStatement> = t.returnStatement(falseCall);
      falseReturn.cps = true;
      path.node.alternate = falseReturn;
    }

    const ifBody : CPS<t.BlockStatement> = t.blockStatement([path.node]);
    ifBody.cps = true;
    const ifFunction : CPS<t.FunctionExpression> = t.functionExpression(null, [k], ifBody);
    ifFunction.cps = true;

    path.replaceWith(ifFunction);
  },
};

// Functions are visited on exit, so that bodies have been CPS'd.
//
// Transformation:
// CPS [[ function (...args) { s } ]] =>
//   [[ function (k, ...args) {
//        return `CPS [[ s ]]`(k);
//      } ]]
//
// Assumptions:
//  - `s` has been visited and is a block statement containing a single
//    function expression.
const func : VisitNode<Function> = {
  exit(path: NodePath<Function>): void {
    if (isCPS(path.node)) return;
    const { params, body } = path.node;

    if (t.isReturnStatement(body.body[0])) return;
    const bodyFunc = (<t.ExpressionStatement>body.body[0]).expression;
    const bodyCall : CPS<t.CallExpression> = t.callExpression(bodyFunc, [<any>params[0]]);
    bodyCall.cps = true;
    const bodyReturn : CPS<t.ReturnStatement> = t.returnStatement(bodyCall);
    bodyReturn.cps = true;
    const bodyBlock : CPS<t.BlockStatement> = t.blockStatement([bodyReturn]);
    bodyBlock.cps = true;
    path.node.body = bodyBlock;
  },
};

const cpsVisitor : Visitor = {
  Program: program,
  BlockStatement: block,
  ReturnStatement: ret,
  ExpressionStatement: exp,
  IfStatement: ifStatement,
  Function: func
}

module.exports = function (babel) {
  return { visitor: cpsVisitor };
};
