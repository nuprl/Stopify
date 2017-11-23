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

const tUndefined = t.unaryExpression("void", t.numericLiteral(0));

function declToAssign(decl: t.VariableDeclarator): t.AssignmentExpression | null {
  if (decl.init === null) {
    return null;
  }
  else {
    return t.assignmentExpression('=', decl.id, decl.init);
  }
}

type State = {
  parentBlock: t.Statement[],
  parentBlockStack: t.Statement[][]
}

const lift = {
  Program(this: State, path: NodePath<t.Program>) {
    this.parentBlock = path.node.body;
    this.parentBlockStack = [];
  },
  Function: {
    enter(this: State, path: NodePath<t.Program>) {
      this.parentBlockStack.push(this.parentBlock);
      const node = path.node;
      if (t.isFunctionDeclaration(node) ||
          t.isFunctionExpression(node) ||
          t.isObjectMethod(node)) {
        this.parentBlock = node.body.body;
      }
      else {
        throw new Error(`Got ${node.type}`);
      }
    },
    exit(this: State, path: NodePath<t.Program>) {
      this.parentBlock = this.parentBlockStack.pop()!;
    },
  },
  VariableDeclaration(this: State, path: NodePath<Lifted<t.VariableDeclaration>>) {
    if (path.node.lifted) {
      return;
    }

    let { kind, declarations } = path.node;
    if (kind === 'const') {
      kind = 'let';
    }

    const assignments: t.Statement[] = [];

    if ((<any>declarations[0]).__boxVarsInit__) {
      return;
    }

    for (const decl of declarations) {
      if (decl.id.type !== 'Identifier') {
        throw new Error(`Destructuring assignment not supported`);
      }
      const id = decl.id.name;
      const newDecl = t.variableDeclaration(kind, 
                        [t.variableDeclarator(decl.id)]);
      this.parentBlock.unshift(lifted(newDecl));
      if (decl.init !== null) {
        // If we call path.insertAfter here, we will add assignments in reverse
        // order. Fortunately, path.insertAfter can take an array of nodes.
        assignments.push(t.expressionStatement(
          t.assignmentExpression('=', decl.id, decl.init)));
      }
    }
    path.replaceWithMultiple(assignments);
  }
}

module.exports = function() {
  return { visitor: lift };
};
