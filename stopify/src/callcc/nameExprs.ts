import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as fastFreshId from '../fastFreshId';

const names: Visitor = {
  ObjectMethod: function (path: NodePath<t.ObjectMethod>): void {
    path.replaceWith(t.objectProperty(path.node.key,
      t.functionExpression(fastFreshId.fresh('funExpr'),
        path.node.params, path.node.body),
      path.node.computed));
  },

  FunctionExpression: function (path: NodePath<t.FunctionExpression>): void {
    if (path.node.id === undefined || path.node.id === null) {
      path.node.id = fastFreshId.fresh('funExpr');
    } else if (path.scope.hasOwnBinding(path.node.id.name)) {
      const new_id = fastFreshId.fresh('funExpr');
      path.scope.rename(path.node.id.name, new_id.name);
    }
  },

  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>): void {
    if (path.scope.hasOwnBinding(path.node.id.name)) {
      const new_id = fastFreshId.fresh('funExpr');
      path.scope.rename(path.node.id.name, new_id.name);
    }
  },
};

module.exports = function () {
  return { visitor: names };
};
