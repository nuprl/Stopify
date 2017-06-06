import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';

const markFuncName = t.identifier('$mark_func')

const funcd: VisitNode<h.Transformed<t.FunctionDeclaration>> = {
  exit(path: NodePath<h.Transformed<t.FunctionDeclaration>>) {
    if(path.node.isTransformed) {
      const markCall = h.directApply(t.callExpression(markFuncName, [path.node.id]));
      path.insertAfter(markCall)
    }
  }
}


const funce: VisitNode<h.Transformed<t.FunctionExpression>> = {
  exit(path: NodePath<h.Transformed<t.FunctionExpression>>) {
    if(path.node.isTransformed) {
      path.node.isTransformed = false;
      path.replaceWith(h.directApply(t.callExpression(markFuncName, [path.node])));
      path.skip();
    }
  }
}

const visitor = {
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
}

module.exports = function () {
  return { visitor }
}
