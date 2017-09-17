/**
 * This transformation boxes certain assignable variables to preserve
 * reference equality when the stack is reconstructed.
 * 
 * Preconditions:
 * 1. The freeIds pass has been applied.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as assert from 'assert';
import { NodePath, Visitor } from 'babel-traverse';
import * as freeIds from '../common/freeIds';
import * as fastFreshId from '../fastFreshId';
import * as bh from '../babelHelpers';
import { Set } from 'immutable';

function box(e: t.Expression): t.ObjectExpression {
  return t.objectExpression([t.objectProperty(t.identifier('box'),
    e === null || e === undefined ?
    t.unaryExpression('void', t.numericLiteral(0)) : e)]);
}

function unbox(e: t.Expression): t.Expression {
  const res = t.memberExpression(e, t.identifier('box'));
  (<any>res).mark = (<any>e).mark
  return res
}

function getParentPath(path: NodePath<t.Node>) {
  const parents = [ "FunctionDeclaration", "FunctionExpression", "Program" ];
  return path.findParent(p => parents.includes(p.node.type));
}
type Parent = t.Program | t.FunctionDeclaration | t.FunctionExpression;

function liftStatement(parentPath: NodePath<Parent>, path: NodePath<t.Node>,
  stmt: t.Statement) {
  const type_ = parentPath.node.type;
  if (type_ === 'Program') {
    (<t.Program>parentPath.node).body.unshift(stmt);
  }
  else if (type_ === 'FunctionDeclaration' || type_ === 'FunctionExpression') {
    (<t.FunctionDeclaration | t.FunctionExpression>parentPath.node).body
      .body.unshift(stmt);
  }
  else {
    throw new assert.AssertionError({
      message: `liftStatement got ${type_} as parent` 
    });
  }
}

function boxVars(parentPath: NodePath<Parent>, vars: Set<string>) {
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

    VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
      assert(path.node.declarations.length === 1,
        'variable declarations must have exactly one binding');
      const decl = path.node.declarations[0];
      if (decl.id.type !== "Identifier") {
        throw new assert.AssertionError({
          message: 'destructuring not supported'
        });
      }
      if (vars.includes(decl.id.name)) {
        liftStatement(parentPath, path,
          t.variableDeclaration('var',
            [t.variableDeclarator(decl.id, box(bh.eUndefined))]));
        if (decl.init === null) {
          path.remove();
        }
        else {
          path.replaceWith(t.assignmentExpression('=', decl.id, decl.init));
        }
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
      initFunction(vars, path);
      if (vars.includes(path.node.id.name)) {
        const fun = t.functionExpression(
          fastFreshId.fresh('fun'),
          path.node.params,
          path.node.body);

        (<any>fun).mark = (<any>path.node).mark;

        // Little hack necessary to preserve annotation left by freeIds.ts
        (<any>fun).nestedFunctionFree = (<any>path.node).nestedFunctionFree;
        const stmt = t.variableDeclaration("var",
          [t.variableDeclarator(path.node.id, box(fun))]);
        liftStatement(parentPath, path, stmt);
        path.remove();
      }
    }
  }

  parentPath.traverse(visitor);
}

/**
 * Produces 'true' if the identifier should be boxed.
 *
 * @param x an identifier
 * @param path the path to the enclosing Function or Program
 */
function shouldBox(x: string, path: NodePath<t.Function | t.Program>): boolean {
  const binds = path.scope.bindings;
  if (path.node.type === 'FunctionExpression' && path.node.id.name === x) {
    return false;
  }
  return (<any>binds[x].kind === "hoisted" || freeIds.isNestedFree(path, x));
}


function initFunction(
  enclosingVars: Set<string>,
  path: NodePath<t.FunctionDeclaration | t.FunctionExpression>) {


  const locals = Set.of(...Object.keys(path.scope.bindings));
  // Mutable variables from this scope that are not shadowed
  const vars0 = enclosingVars.subtract(locals);
  // Mutable variables from the inner scope
  const vars1 = locals.filter(x => shouldBox(x!, path)).toSet();

  boxVars(path, vars0.union(vars1));


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
    boxVars(path, Set.of(...vars));
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
