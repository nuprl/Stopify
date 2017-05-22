import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import * as h from './helpers';

type Transformed<T> = T & {
  isTransformed?: boolean
}

function transformed<N>(n: Transformed<N>): Transformed<N> {
  n.isTransformed = true;
  return n;
}

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'),
  [t.callExpression(
    t.memberExpression(t.identifier('$runProg'), t.identifier('__generator__')),
    []
  )]
))

const markFunc: t.Statement = h.letExpression(
  t.identifier('$mark_func'),
  parseExpression(`
    (function (func, generator) {
      func.__generator__ = generator;
      func.$isGen = true;
      func.call = {
        $isGen: true,
        __generator__: generator.call.bind(generator)
      }
      func.apply = {
        $isGen: true,
        __generator__: generator.apply.bind(generator)
      }
    })
    `)
)

const ifYield = t.ifStatement(
  t.binaryExpression('===',
    t.identifier('$counter'),
    t.identifier('$yieldCounter')
  ),
  t.blockStatement([
    t.expressionStatement(
      t.assignmentExpression('=', t.identifier('$counter'), t.numericLiteral(0))
    ),
    t.expressionStatement(
      t.yieldExpression(t.numericLiteral(0), false)
    )
  ]),
  t.blockStatement([
    t.expressionStatement(
      t.updateExpression('++', t.identifier('$counter'), false)
    )
  ])
)

const program : VisitNode<t.Program> = {
  enter: function (path: NodePath<t.Program>): void {
    const lastLine = <t.Statement>path.node.body.pop();
    if(t.isExpressionStatement(lastLine)) {
      let result = t.returnStatement(lastLine.expression);
      path.node.body.push(result);
    } else {
      path.node.body.push(lastLine)
    }
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [markFunc, ...path.node.body, runProg]
  },
};

// NOTE(rachit): Assumes that all functions in the call expression are
// identifiers.
const callExpression: VisitNode<Transformed<t.CallExpression>> =
  function (path: NodePath<Transformed<t.CallExpression>>): void {
    const exp = path.node;
    if(exp.isTransformed) return
    else exp.isTransformed = true;

    const { callee, arguments: args } = path.node;

    const cond = t.conditionalExpression(
      t.memberExpression(path.node.callee, t.identifier('$isGen')),
      t.yieldExpression(transformed(t.callExpression(
        t.memberExpression(callee, t.identifier('__generator__')), args
      )), true),
      path.node
    )
    path.replaceWith(cond);
  };

const loop: VisitNode<t.Loop> = function (path: NodePath<t.Loop>): void {
  if (t.isBlockStatement(path.node.body)) {
    path.node.body.body.unshift(ifYield);
  } else {
    throw new Error('Body of loop is not a block statement')
  }
}

const funcd: VisitNode<t.FunctionDeclaration> =
  function (path: NodePath<t.FunctionDeclaration>): void {
    // Create __generator__ property for function
    const { params, id }  = path.node
    // Make a copy of the body.
    const body = path.node.body.body.slice(0)
    body.unshift(ifYield);
    const genFunc = transformed(
      t.functionExpression(undefined, params, t.blockStatement(body), true, false)
    )

    // Change body of function to throw statement
    const throwString = `Generator function ${id.name} called directly.`
    path.node.body.body = [t.throwStatement(t.stringLiteral(throwString))]

    path.insertAfter(
      transformed(t.callExpression(
        t.identifier('$mark_func'), [id, genFunc]
      ))
    )
};

const funce: VisitNode<Transformed<t.FunctionExpression>> =
  function (path: NodePath<Transformed<t.FunctionExpression>>): void {
    if(path.node.isTransformed) return
    const decl = path.parent;
    if (!t.isVariableDeclarator(decl)) {
      return
    } else {
      // Create __generator__ property for function
      const { params }  = path.node;
      const id = <t.Expression>decl.id

      // Make a copy of the body.
      const body = path.node.body.body.slice(0)
      body.unshift(ifYield);

      // If the function expression is itseld named, declare in the generator
      // body.
      const funeName = (<t.FunctionExpression>decl.init).id
      if(funeName) {
        body.unshift(h.letExpression(funeName, <t.Identifier>decl.id))
      }

      const genFunc = transformed(
        t.functionExpression(undefined, params, t.blockStatement(body), true, false)
      )

      // Change body of function to throw statement
      const throwString = `Generator function called directly.`
      path.node.body.body = [t.throwStatement(t.stringLiteral(throwString))]

      path.getStatementParent().insertAfter(
        transformed(t.callExpression(t.identifier('$mark_func'), [id, genFunc])));
    }
};

const yieldVisitor: Visitor = {
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
