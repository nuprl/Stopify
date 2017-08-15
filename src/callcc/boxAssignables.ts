/**
 * This transformation boxes certain assignable variables to preserve
 * reference equality when the stack is reconstructed.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as freeIds from '../common/freeIds';

function box(e: t.Expression): t.ObjectExpression {
  return t.objectExpression([t.objectProperty(t.identifier('box'),
    e === null || e === undefined ?
    t.unaryExpression('void', t.numericLiteral(0)) : e)]);
}

function unbox(e: t.Expression): t.Expression {
  return  t.memberExpression(e, t.identifier('box'));
}

function parentBlock(path: NodePath<t.Node>): t.Statement[] {
  const parents = [ "FunctionDeclaration", "FunctionExpression", "Program" ];
  const parent = path.findParent(p => parents.includes(p.node.type)).node;
  if (parent.type === "Program") {
    return (<t.Program>parent).body;
  }
  else {
    return (<t.FunctionExpression | t.FunctionDeclaration>parent).body.body;
  }
}

function boxVars(path: NodePath<t.Node>, vars: string[]) {
  const visitor = {
    ReferencedIdentifier(path: NodePath<t.Identifier>) {
      path.skip();
      // NOTE(arjun): The parent type tests are because labels are
      // categorized as ReferencedIdentifiers, which is a bug in
      // Babel, in my opinion.
      if (path.parent.type === "BreakStatement" ||
          path.parent.type === "LabeledStatement") {
        return;
      }
      if (vars.includes(path.node.name)) {
        path.replaceWith(unbox(path.node));
      }
    },
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      path.skip();
      if (path.node.id.type !== "Identifier") {
        throw "unsupported";
      }
      if (vars.includes(path.node.id.name)) {
        path.node.init = box(path.node.init);
      }
    },
    BindingIdentifier(path: NodePath<t.Identifier>) {
      path.skip();
      if (path.parent.type !== "AssignmentExpression") {
        return;
      }
      if (vars.includes(path.node.name)) {
        path.replaceWith(unbox(path.node))
      }

    },
    FunctionExpression(path: NodePath<t.FunctionExpression>) {
      path.skip();
      initFunction(vars, path);
    },
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      path.skip();
      // Box this function declaration if it is updated.
      const x = path.node.id.name;
      if (vars.includes(x)) {
        const init = t.expressionStatement(
          t.assignmentExpression(
            "=", t.identifier(x), box(t.identifier(x))));
        (<any>init).__boxVarsInit__ = true;
        parentBlock(path).unshift(init);
      }

      initFunction(vars, path);
    }
  }

  path.traverse(visitor);
}

/**
 * Produces 'true' if the identifier should be boxed.
 *
 * @param x an identifier
 * @param path the path to the enclosing Function or Program
 */
function shouldBox(x: string, path: NodePath<t.Function | t.Program>): boolean {
  const binds = path.scope.bindings;
  return !binds[x].constant &&
    (<any>binds[x].kind === "hoisted" || freeIds.isNestedFree(path, x));
}


function initFunction(
  enclosingVars: string[],
  path: NodePath<t.FunctionDeclaration | t.FunctionExpression>) {
  // Mutable variables from this scope that are not shadowed
  const vars0 = enclosingVars.filter(x => !path.scope.hasOwnBinding(x));
  // Mutable variables from the inner scope
  const vars1 = Object.keys(path.scope.bindings)
    .filter(x => shouldBox(x, path));

  boxVars(path, [...vars0, ...vars1]);


  // Box arguments if necessary. We do this after visiting the function
  // body or the initialization statements get messed up.
  for(let param of path.node.params) {
    if (param.type !== 'Identifier' || !vars1.includes(param.name)) {
      continue;
    }
    const x = param.name;
    const init = t.expressionStatement(
      t.assignmentExpression(
        "=", t.identifier(x), box(t.identifier(x))));
    (<any>init).__boxVarsInit__ = true;
    path.node.body.body.unshift(init);
  }

}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    const binds = path.scope.bindings;
    const vars = Object.keys(path.scope.bindings)
      .filter(x => shouldBox(x, path));
    boxVars(path, vars);
  }
}

module.exports = function() {
  return { visitor };
}

function main() {
  const filename = process.argv[2];
  const opts = { plugins: [() => ({ visitor })], babelrc: false };
  babel.transformFile(filename, opts, (err, result) => {
    if (err !== null) {
      throw err;
    }
    console.log(result.code);
  });
}

if (require.main === module) {
  main();
}
