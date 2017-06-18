import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as h from '../common/helpers';

module.exports = function() {
  return {
    visitor: {
      WhileStatement: {
        exit(path: NodePath<t.WhileStatement>) {
          const { test, body } = path.node

          // Name the function representing the while loop.
          const fName = path.scope.generateUidIdentifier('while');

          // Create the body for the function.
          const fBody = h.flatBodyStatement([
            t.ifStatement(test, h.flatBodyStatement([body,
              t.returnStatement(t.callExpression(t.memberExpression(fName,
                t.identifier('call')), [t.thisExpression()]))]))]);
          // Create the function representing the while loop.
          const fExpr = t.functionExpression(fName, [], fBody);
          const fDecl = h.letExpression(fName, fExpr);
          path.replaceWith(h.flatBodyStatement([fDecl, t.expressionStatement(
            t.callExpression(t.memberExpression(fName,
              t.identifier('call')), [t.thisExpression()]))]));
        },
      },
    }
  }
}
