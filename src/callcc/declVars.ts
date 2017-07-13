/**
 * Moves var statements to the top of functions.
 *
 * When a var is moved, it is initialized to undefined. The
 * transformation introduces assignment statements where the var statement
 * originally occurred.
 */
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {tag, letExpression} from '../common/helpers';

type Lifted<T> = T & {
  lifted?: boolean
}
const lifted = <T>(t: T) => tag('lifted', t, true);

function declToAssign(decl: t.VariableDeclarator): t.AssignmentExpression {
  return decl.init === null ?
    t.assignmentExpression('=', decl.id, t.nullLiteral()) :
    t.assignmentExpression('=', decl.id, decl.init)
}

const lift: Visitor = {
  VariableDeclaration:
  function (path: NodePath<Lifted<t.VariableDeclaration>>): void {
    if (path.node.lifted) {
      return;
    }
    let { kind, declarations } = path.node;
    if (kind === 'const') {
      kind = 'let';
    }
    const topScope = path.getFunctionParent();
    switch (topScope.node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        const ids = declarations.map(decl => decl.id);
        // TODO(sbaxter): Update babel typescript declaration to type
        // `unshiftContainer` and remove `any` cast
        (<any>topScope.get('body')).unshiftContainer('body',
          lifted(t.variableDeclaration(kind,
            ids.map(id => t.variableDeclarator(id, undefined)))));
        const exp = declarations.length === 1 ?
          declToAssign(declarations[0]):
          t.sequenceExpression(declarations.map(decl => declToAssign(decl)));
        path.replaceWith(exp);
        break;
      }
      case 'Program':
        const ids = declarations.map(decl => decl.id);
        // TODO(sbaxter): Update babel typescript declaration to type
        // `unshiftContainer` and remove `any` cast
        (<any>topScope).unshiftContainer('body',
          lifted(t.variableDeclaration(kind,
            ids.map(id => t.variableDeclarator(id, undefined)))));
        const exp = declarations.length === 1 ?
          declToAssign(declarations[0]):
          t.sequenceExpression(declarations.map(decl => declToAssign(decl)));
        path.replaceWith(t.expressionStatement(exp));
        break;
      default:
        throw new Error(
          `Expected to find function/program parent, but found ${topScope.type} instead`);
    }
  }
};

module.exports = function() {
  return { visitor: lift };
};
