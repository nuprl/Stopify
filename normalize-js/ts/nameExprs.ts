import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { fresh } from '@stopify/hygiene';

const names: Visitor = {
  ObjectMethod: function (path: NodePath<t.ObjectMethod>): void {
    if (path.node.kind === "method") {
      let fun = t.functionExpression(fresh('method'),
          path.node.params, path.node.body);
        // Little hack necessary to preserve annotation left by freeIds and singleVarDecls
        (<any>fun).nestedFunctionFree = (<any>path.node).nestedFunctionFree;
        (<any>fun).renames = (<any>path.node).renames;
      path.replaceWith(t.objectProperty(path.node.key,
        fun,
        path.node.computed));
    }
  },

  FunctionExpression: function (path: NodePath<t.FunctionExpression>): void {
    if (path.node.id === undefined || path.node.id === null) {
      path.node.id = fresh('funExpr');
      (path.node as any).originalName = '(anonymous function)';
    }
    /*
     * This deals with the following kind of code:
     *
     *   function F() { var F; }
     *
     * We need to able to reference F within its body to restore its stack
     * frame. Therefore, we rename the local variable F.
     */
    else if (path.scope.hasOwnBinding(path.node.id.name) &&
      <any>path.scope.bindings[path.node.id.name].kind !== 'local') {
      const new_id = fresh('x');
      path.scope.rename(path.node.id.name, new_id.name);
    }
  },
  // NOTE(arjun): Dead code? I think no FunctionDeclarations exist at this
  // point.
  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>): void {
    if (path.scope.hasOwnBinding(path.node.id.name) &&
      <any>path.scope.bindings[path.node.id.name].kind !== 'local') {
      const new_id = fresh('funExpr');
      path.scope.rename(path.node.id.name, new_id.name);
    }
  },
};

module.exports = function () {
  return { visitor: names };
};
