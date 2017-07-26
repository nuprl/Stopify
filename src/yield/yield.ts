import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import {
  Transformed, transformed, FlatnessMark, OptionsAST
} from '../common/helpers'

let opt = false;
let tail_calls = false
let no_eval = false;

const program = {
  enter(path: NodePath<OptionsAST<t.Program>>) {
    if(path.node.options) {
      const options = path.node.options
      opt = options.optimize
      tail_calls = options.tail_calls
      no_eval = options.no_eval
    }
  }
}

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'), [t.callExpression(t.identifier('$runProg'), [])]))

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

// NOTE(rachit): Assumes that all functions in the call expression are
// identifiers.
const callExpression = {
  exit(path: NodePath<Transformed<t.CallExpression>>): void {
    const exp = path.node;
    if(exp.isTransformed) return
    else exp.isTransformed = true;

    let callee = path.node.callee;
    // Don't check the callee if a function expression since we they are
    // always transformed.
    if (t.isFunctionExpression(callee)) {
      if(callee.generator) {
        path.replaceWith(t.yieldExpression(path.node, true))
      }
      return;
    }
    // Don't transform `eval`
    else if (t.isIdentifier(callee) && callee.name === 'eval') {
      if (no_eval) {
        path.skip();
      } else {
        path.replaceWith(t.yieldExpression(path.node, true))
      }
    }
    else if (t.isMemberExpression(path.node.callee)) {
      if (t.isIdentifier(path.node.callee.property)) {
        if(path.node.callee.property.name === 'call' ||
          path.node.callee.property.name === 'apply') {
          callee = path.node.callee.object;
        }
      } else if (t.isStringLiteral(path.node.callee.property)) {
        if(path.node.callee.property.value === 'call' ||
          path.node.callee.property.value === 'apply') {
          callee = path.node.callee.object;
        }
      }
    }

    const cond = t.conditionalExpression(
      t.memberExpression(callee, t.identifier('$isTransformed')),
      t.yieldExpression(path.node, true),
      path.node)
    path.replaceWith(cond);
  }
}

// Tail calling optimization for callExpression within a return.
const retStmt = {
  enter(path: NodePath<Transformed<t.ReturnStatement>>) {
    if(tail_calls) {
      const { argument } = path.node
      if(t.isCallExpression(argument)) {
        const genObj = t.objectExpression([
          t.objectProperty(t.identifier('__isGen'), t.booleanLiteral(true)),
          t.objectProperty(t.identifier('__gen'), transformed(argument))])
        path.node.argument = t.yieldExpression(genObj, false)
      }
    }
  }
}

const loop: VisitNode<Transformed<t.Loop>> = function (path: NodePath<Transformed<t.Loop>>): void {
  if (path.node.isTransformed) return
  if (t.isBlockStatement(path.node.body)) {
    path.node.body.body.unshift(ifYield);
    transformed(path.node)
  } else {
    throw new Error('Body of loop is not a block statement')
  }
}

const funcd = {
  enter(path: NodePath<FlatnessMark<t.FunctionDeclaration>>) {
    if(path.node.mark === 'Flat') return
    if(path.node.generator === false) {
      path.node.generator = true
      path.node.body.body.unshift(ifYield)
      transformed(path.node)
    }
  }
}

const funce = {
  enter(path: NodePath<FlatnessMark<t.FunctionExpression>>) {
    if(opt && path.node.mark === 'Flat') return
    if(path.node.generator === false) {
      path.node.generator = true
      path.node.body.body.unshift(ifYield)
      transformed(path.node)
    }
  }
}

const visitor = {
  Program: program,
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
  ReturnStatement: retStmt,
}

module.exports = function() {
  return { visitor };
};
