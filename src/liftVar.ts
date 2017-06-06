import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {Hoisted, hoisted, letExpression} from './helpers';

const lift: Visitor = {
  VariableDeclaration: function (path: NodePath<Hoisted<t.VariableDeclaration>>): void {
    if (path.node.hoisted) {
      return;
    }
    const { kind, declarations } = path.node;
    if (kind === 'var') {
      const topScope = path.getFunctionParent();
      switch (topScope.node.type) {
        case 'FunctionDeclaration': {
          const { body } = <t.FunctionDeclaration>topScope.node;
          const ids = declarations.map(decl => decl.id);
          body.body.unshift(hoisted(t.variableDeclaration('var',
            ids.map(id => t.variableDeclarator(id, undefined)))));
          path.replaceWith(t.expressionStatement(t.sequenceExpression(
            declarations.map(decl =>
              decl.init === null ?
              t.assignmentExpression('=', decl.id, t.nullLiteral()) :
              t.assignmentExpression('=', decl.id, decl.init)))));
          break;
        }
        case 'FunctionExpression': {
          const { body } = <t.FunctionDeclaration>topScope.node;
          const ids = declarations.map(decl => decl.id);
          body.body.unshift(hoisted(t.variableDeclaration('var',
            ids.map(id => t.variableDeclarator(id, undefined)))));
          path.replaceWith(t.expressionStatement(t.sequenceExpression(
            declarations.map(decl =>
              decl.init === null ?
              t.assignmentExpression('=', decl.id, t.nullLiteral()) :
              t.assignmentExpression('=', decl.id, decl.init)))));
          break;
        }
        case 'Program':
          const { body } = <t.Program>topScope.node;
          const ids = declarations.map(decl => decl.id);
          body.unshift(hoisted(t.variableDeclaration('var',
            ids.map(id => t.variableDeclarator(id, undefined)))));
          path.replaceWith(t.expressionStatement(t.sequenceExpression(
            declarations.map(decl =>
              decl.init === null ?
              t.assignmentExpression('=', decl.id, t.nullLiteral()) :
              t.assignmentExpression('=', decl.id, decl.init)))));
          break;
        default:
          throw new Error(
            `Expected to find function/program parent, but found ${topScope.type} instead`);
      }
    }
  }
};

module.exports = function() {
  return { visitor: lift };
};
