/**
 * Plugin to transform JS programs into CPS form.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {CPS, cps, FunctionNode, ReturnStatement} from './helpers';

// Hack to avoid applying visitors to newly constructed nodes.
function isCPS(node: CPS<t.Node>): boolean {
  return node.cps === undefined ? false : true;
}

function createTailFunction(tailPath: NodePath<t.Node>,
  tail: t.Statement[],
  headK: t.Identifier,
  tailK: t.Identifier): t.FunctionExpression {
    const newTail = foldSequence(tailPath, tail);
    const tailCall = cps(t.callExpression(newTail, [headK]));
    const tailReturn = cps(t.returnStatement(tailCall));
    const tailBody = cps(t.blockStatement([tailReturn]));
    const tailFunction = cps(t.functionExpression(undefined, [tailK], tailBody));
    return tailFunction;
  }

function createHeadFunction(head: t.Expression,
  headK: t.Identifier,
  ...headCallArgs: Array<t.Expression|t.SpreadElement>): t.FunctionExpression {
    const headCall = cps(t.callExpression(head, [...headCallArgs]));
    const headReturn = cps(t.returnStatement(headCall));
    const headBody = cps(t.blockStatement([headReturn]));
    const headFunction = cps(t.functionExpression(undefined, [headK], headBody));
    return headFunction;
  }

function foldSequence(path: NodePath<t.Node>, statements: Array<t.Statement>): t.FunctionExpression {
  let tailPath = path.getSibling('1');
  const [head, ...tail] = statements;
  const headK = path.scope.generateUidIdentifier('k');
  const tailK = path.scope.generateUidIdentifier('k');
  if (head === undefined) {
    const k = path.scope.generateUidIdentifier('k');
    const kCall = cps(t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]));
    const kReturn = cps(t.returnStatement(kCall));
    const kBody = cps(t.blockStatement([kReturn]));
    const kFunction = cps(t.functionExpression(undefined, [k], kBody));
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
          const tailFunction = createTailFunction(tailPath, tail, headK, <t.Identifier>id);
          let args = [tailFunction, ...init.arguments];
          const headFunction = createHeadFunction(init.callee, headK, ...args);
          return headFunction;
        } else {
          const k = path.scope.generateUidIdentifier('k');
          const kCall = cps(t.callExpression(k, [<t.Identifier>id]));
          const kReturn = cps(t.returnStatement(kCall));
          const kBody = cps(t.blockStatement([head, kReturn]));
          const expFunction = cps(t.functionExpression(undefined, [k], kBody));

          const tailFunction = createTailFunction(tailPath, tail, headK, <t.Identifier>id);
          const headFunction = createHeadFunction(expFunction, headK, tailFunction);
          return headFunction;
        }
      } case 'FunctionDeclaration': {
        const k = path.scope.generateUidIdentifier('k');
        const kCall = cps(t.callExpression(k, [head.id]));
        const kReturn = cps(t.returnStatement(kCall));
        const kBody = cps(t.blockStatement([head, kReturn]));
        const expFunction = cps(t.functionExpression(undefined, [k], kBody));

        const tailFunction = createTailFunction(tailPath, tail, headK, head.id);
        const headFunction = createHeadFunction(expFunction, headK, tailFunction);
        return headFunction;
      } case 'BlockStatement': {
        const tailFunction = createTailFunction(tailPath, tail, headK, tailK);
        const blockFunction = foldSequence(path, head.body);
        const headFunction = createHeadFunction(blockFunction, headK, tailFunction);
        return headFunction;
      } default: {
        const k = path.scope.generateUidIdentifier('k');
        const kCall = cps(t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]));
        const kReturn = cps(t.returnStatement(kCall));
        const kBody = cps(t.blockStatement(<t.Statement[]>[path.node, kReturn]));
        const expFunction = cps(t.functionExpression(undefined, [k], kBody));

        return expFunction;
      }
    }
  }
}

const program : VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>): void {
    const { body } = path.node;
    const bodyPath = path.get('body.0');
    const newBody = cps(t.expressionStatement(foldSequence(bodyPath, body)));
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

    let bodyPath = path.get('body.0');
    if (bodyPath === undefined) {
      bodyPath = path;
    }
    const newBody = foldSequence(bodyPath, body);

    path.node.body = [t.expressionStatement(newBody)];
  },
};

// Return Statements
//
// Transformation:
// CPS [[ return e; ]] =>
//   let k = return continuation;
//   [[ function (k') {
//        return k(`CPS [[ e ]]`);
//      } ]]
//
// Assumptions:
//  - A prior pass has tagged all return statements with the continuation
//    argument of the appropriate function.
const ret : VisitNode<t.ReturnStatement> =
  function (path: NodePath<ReturnStatement>): void {
    if (isCPS(path.node)) return;
    if (t.isCallExpression(path.node.argument)) {
      const callArgs = [path.node.kArg, ...path.node.argument.arguments];
      path.node.argument.arguments = callArgs;
      (<CPS<t.Node>>path.node.argument).cps = true;
      (<CPS<t.Node>>path.node).cps = true;
      return;
    }

    const k = path.scope.generateUidIdentifier('k');
    const returnCall = cps(t.callExpression(path.node.kArg, [path.node.argument]));
    const newReturn = cps(t.returnStatement(returnCall));
    const returnBody = cps(t.blockStatement([newReturn]));
    const returnFunction = cps(t.functionExpression(undefined, [k], returnBody));
    const fExp = cps(t.expressionStatement(returnFunction));

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
    const k = path.scope.generateUidIdentifier('k');
    const kCall = cps(t.callExpression(k, [t.unaryExpression('void', t.numericLiteral(0))]));
    const kReturn = cps(t.returnStatement(kCall));
    const kBody = cps(t.blockStatement([path.node, kReturn]));
    const expFunction = cps(t.functionExpression(undefined, [k], kBody));
    const newExp = cps(t.expressionStatement(expFunction));

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
    const k = path.scope.generateUidIdentifier('k');
    const trueCall = cps(t.callExpression((<any>consequent).body[0].expression, [k]));
    const trueReturn = cps(t.returnStatement(trueCall));
    path.node.consequent = trueReturn;
    if (alternate !== null) {
      const falseCall = cps(t.callExpression((<any>alternate).body[0].expression, [k]));
      const falseReturn = cps(t.returnStatement(falseCall));
      path.node.alternate = falseReturn;
    }

    const ifBody = cps(t.blockStatement([path.node]));
    const ifFunction = cps(t.functionExpression(undefined, [k], ifBody));

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
const func : VisitNode<FunctionNode> = {
  exit(path: NodePath<FunctionNode>): void {
    if (isCPS(path.node)) return;
    const { params, body } = path.node;

    if (t.isReturnStatement(body.body[0])) return;
    const bodyFunc = (<t.ExpressionStatement>body.body[0]).expression;
    const bodyCall = cps(t.callExpression(bodyFunc, [<any>params[0]]));
    const bodyReturn = cps(t.returnStatement(bodyCall));
    const bodyBlock = cps(t.blockStatement([bodyReturn]));
    path.node.body = bodyBlock;
  },
};

const breakStatement : VisitNode<t.BreakStatement> =
  function (path: NodePath<t.BreakStatement>): void {
    const { label } = path.node;
    if (label === null) {
      return;
    }
    const labelCall = cps(t.callExpression(label, [t.unaryExpression('void', t.numericLiteral(0))]));
    const labelReturn = cps(t.returnStatement(labelCall));
    path.replaceWith(labelReturn);
  };

const labelStatement : VisitNode<t.LabeledStatement> = {
  enter(path: NodePath<t.LabeledStatement>): void {
    const { label, body } = path.node;
    const newBody = t.isBlockStatement(body) ? body : t.blockStatement([body]);
    const labelFunc = t.functionExpression(undefined, [<any>label], newBody);
    path.replaceWith(t.expressionStatement(labelFunc));
  }
};

const cpsVisitor : Visitor = {
  Program: program,
  BlockStatement: block,
  ReturnStatement: ret,
  ExpressionStatement: exp,
  IfStatement: ifStatement,
  BreakStatement: breakStatement,
  LabeledStatement: labelStatement,
  Function: func
}

module.exports = function() {
  return { visitor: cpsVisitor };
};
