import { NodePath, VisitNode } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';

const directApply = <T>(t: T) => h.tag('isDirect', t, true);

const markFuncName = t.identifier('$mark_func');

const funcd: VisitNode<h.Transformed<t.FunctionDeclaration>> = {
  exit(path: NodePath<h.Transformed<t.FunctionDeclaration>>) {
    if(path.node.isTransformed) {
      const markCall = t.expressionStatement(directApply(
        t.callExpression(markFuncName, [path.node.id])));
      // Place the call to mark_func on the top of the nearest block.
      // This is because a function might be called before reaching it's
      // decl (hoisting).
      const fParent: any = path.findParent(p => t.isFunctionDeclaration(p)
        || t.isFunctionExpression(p));

      if (fParent === undefined || fParent === null) {
        const program: any = path.findParent(p => t.isProgram(p));
        program.node.body.unshift(markCall);
      } else {
        fParent.node.body.body.unshift(markCall);
      }
    }
  }
};

const funce: VisitNode<h.Transformed<t.FunctionExpression>> = {
  exit(path: NodePath<h.Transformed<t.FunctionExpression>>) {
    if(path.node.isTransformed) {
      path.node.isTransformed = false;
      path.replaceWith(
        directApply(t.callExpression(markFuncName, [path.node])));
      path.skip();
    }
  }
};

const visitor = {
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
};

module.exports = function () {
  return { visitor };
};
