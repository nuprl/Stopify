import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

const names: Visitor = {
  FunctionExpression: function (path: NodePath<t.FunctionExpression>): void {
    if (path.node.id === undefined || path.node.id === null) {
      path.node.id = path.scope.generateUidIdentifier('funExpr');
    } else if (path.scope.hasOwnBinding(path.node.id.name)) {
      path.scope.rename(path.node.id.name);
    }
  },

  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>): void {
    if (path.scope.hasOwnBinding(path.node.id.name)) {
      path.scope.rename(path.node.id.name);
    }
  },
};

module.exports = function () {
  return { visitor: names };
};
