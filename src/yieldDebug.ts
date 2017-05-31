import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import {
  Transformed, transformed, Tag, OptimizeMark, LineMappingMark
} from './helpers'
import { LineMapping } from './steppifyInterface';

let lineMapping: LineMapping;

 /* NOTE(rachit): Expects that the program is being ervaluated in a context
  * where `$that` is set to the steppable object that owns the code.
  */
const runProg = t.expressionStatement(t.assignmentExpression('=',
  t.memberExpression(t.identifier('$that'), t.identifier('$currentState')),
  t.callExpression(t.identifier('$runProg'), [])
))

const program : VisitNode<LineMappingMark<t.Program>> = {
  enter: function (path: NodePath<LineMappingMark<t.Program>>): void {

    // Set line mapping
    if(path.node.lineMapping) {
      lineMapping = path.node.lineMapping
    } else {
      // NOTE(rachit): This can't actually happen
      throw new Error('No line mapping found')
    }

    // Wrap program into a function.
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [...path.node.body, runProg]
  },
};

// NOTE(rachit): Assumes that all functions in the call expression are
// identifiers.
const callExpression: VisitNode<OptimizeMark<Transformed<t.CallExpression>>> =
  function (path: NodePath<OptimizeMark<Transformed<t.CallExpression>>>): void {
    const exp = path.node;
    if(exp.isTransformed) return
    else exp.isTransformed = true;

    if (exp.OptimizeMark === 'Untransformed') {
      return;
    }
    else if (exp.OptimizeMark === 'Transformed') {
      path.replaceWith(t.yieldExpression(exp, true))
    }
    else {
      const cond = t.conditionalExpression(
        t.memberExpression(path.node.callee, t.identifier('$isTransformed')),
        t.yieldExpression(path.node, true),
        path.node)
      path.replaceWith(cond);
    }
  };

const block: VisitNode<t.BlockStatement> = function (path: NodePath<t.BlockStatement>): void {
  const { body } = path.node;
  const nBody = []
  for (let i =0; i<body.length; i++) {
    const loc = body[i].loc
    let mark;
    if (loc) {
      const ln: number | null = lineMapping.getLine(loc.start.line, loc.start.column)
      if (ln) {
        mark = t.numericLiteral(ln)
      } else {
        mark = t.nullLiteral()
      }
    } else {
      mark = t.nullLiteral()
    }
    nBody.push(t.expressionStatement(t.yieldExpression(mark)));
    nBody.push(body[i]);
  }

  path.node.body = nBody
}

const func: VisitNode<Transformed<t.Function>> = function (path: NodePath<Transformed<t.Function>>) {
  path.node.generator = true;
  path.node.isTransformed = true
}

const yieldVisitor: Visitor = {
  BlockStatement: block,
  CallExpression: callExpression,
  Program: program,
  FunctionDeclaration: func,
  FunctionExpression: func,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
