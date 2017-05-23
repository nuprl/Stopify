import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {parseExpression} from 'babylon';
import * as h from './helpers';

const markFuncName = t.identifier('$mark_func')

const markFunc: t.Statement = h.letExpression(
  markFuncName,
  parseExpression(`
    (function (f) {
      f.$isTransformed = true;
      f.call = f.call.bind(f);
      f.call.$isTransformed = true;
      f.apply = f.apply.bind(f);
      f.apply.$isTransformed = true;
      return f;
    })
    `)
)

const program : VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>): void {
    path.node.body = [markFunc, ...path.node.body]
  },
};

const funcd: VisitNode<h.Transformed<t.FunctionDeclaration>> =
  function (path: NodePath<h.Transformed<t.FunctionDeclaration>>) {
    if(path.node.isTransformed) {
      const markCall = t.callExpression(markFuncName, [path.node.id])
      path.insertAfter(markCall)
    }
}


const funce: VisitNode<h.Transformed<t.FunctionExpression>> =
  function (path: NodePath<h.Transformed<t.FunctionExpression>>) {
    if(path.node.isTransformed) {
      path.node.isTransformed = false;
      path.replaceWith(t.callExpression(markFuncName, [path.node]))
    }
  }

const visitor = {
  Program: program,
  FunctionDeclaration: funcd,
  FunctionExpression: funce
}

module.exports = function () {
  return { visitor }
}
