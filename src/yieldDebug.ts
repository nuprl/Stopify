import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import {
  Transformed, transformed, Tag, OptimizeMark, LineMappingMark
} from './helpers'
import { LineMapping } from './steppifyInterface';

let lineMapping: LineMapping;

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'), [t.callExpression(t.identifier('$runProg'), [])]))

const program : VisitNode<LineMappingMark<t.Program>> = {
  enter: function (path: NodePath<LineMappingMark<t.Program>>): void {

    if(path.node.lineMapping) {
      lineMapping = path.node.lineMapping
    } else {
      // NOTE(rachit): This can't actually happen
      throw new Error('No line mapping found')
    }

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
      const ln: number | null = lineMapping.getLine(loc.start.line)
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

const func: VisitNode<t.Function> = function (path: NodePath<t.Function>) {
  path.node.generator = true;
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
