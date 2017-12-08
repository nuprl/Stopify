/**
 * Moves var statements to the top of functions.
 *
 * When a var is moved, it is initialized to undefined. The
 * transformation introduces assignment statements where the var statement
 * originally occurred.
 */
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {tag} from '../common/helpers';

type Lifted<T> = T & {
  lifted?: boolean
}
const lifted = <T>(t: T) => tag('lifted', t, true);

const tUndefined = t.unaryExpression("void", t.numericLiteral(0));

function declToAssign(decl: t.VariableDeclarator): t.AssignmentExpression | null {
  if (decl.init === null) {
    return null;
  }
  else {
    return t.assignmentExpression('=', decl.id, decl.init);
  }
}

function getFunctionArgs(path: NodePath<t.Node>): string[] {
  const node = path.node;
  if (node.type === 'FunctionDeclaration' || 
      node.type === 'FunctionExpression') {
    return (<any>node).params.map((x: t.Identifier) => x.name);
  }
  else {
    return [];
  }
}

function getBlock(node: t.Node): t.Statement[] {
  if (t.isFunctionDeclaration(node) ||
    t.isFunctionExpression(node)) {
    return node.body.body;
  } else if (t.isProgram(node)) {
    return node.body;
  } else if (t.isObjectMethod(node)) {
    return node.body.body;
  }else {
    throw new Error(`Got ${node.type}`);
  }
}

const lift: Visitor = {
  VariableDeclaration(path: NodePath<Lifted<t.VariableDeclaration>>) {
    if (path.node.lifted) {
      return;
    }
    let { declarations } = path.node;
    const stmts: t.Statement[] = [];

    if ((<any>declarations[0]).__boxVarsInit__) {
      return;
    }

    for (const decl of declarations) {
      if (decl.id.type !== 'Identifier') {
        throw new Error(`Destructuring assignment not supported`);
      }
      const id = decl.id.name;
      const newDecl = t.variableDeclaration('var',
                        [t.variableDeclarator(decl.id)]);
      stmts.push(lifted(newDecl));
      if (decl.init !== null) {
        // If we call path.insertAfter here, we will add assignments in reverse
        // order. Fortunately, path.replaceWithMultiple can take an array of nodes.
        stmts.push(t.expressionStatement(
          t.assignmentExpression('=', decl.id, decl.init)));
      }
    }
    path.replaceWithMultiple(stmts);
  }
}

module.exports = function() {
  return { visitor: lift };
};
