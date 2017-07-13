import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

const names: Visitor = {
  FunctionExpression: function (path: NodePath<t.FunctionExpression>): void {
    if (path.node.id === undefined || path.node.id === null) {
      path.node.id = path.scope.generateUidIdentifier('funExpr');
    }
  },
};

module.exports = function () {
  return { visitor: names };
};
