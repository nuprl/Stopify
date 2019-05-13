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
import { Binding, NodePath } from 'babel-traverse';
import * as h from '@stopify/util';
import { freeIds } from '@stopify/normalize-js';
import { Set } from 'immutable';
import { fresh } from '@stopify/hygiene';

type Parent = t.Program | t.FunctionDeclaration | t.FunctionExpression;

type State = {
  parentPath: NodePath<Parent>,
  vars: Set<string>,
  parentPathStack: NodePath<Parent>[],
  varsStack: Set<string>[],
  liftDeclStack: t.Statement[][],
  liftAssignStack: t.Statement[][],
  opts: { boxes: string[] },
};

export function box(e: t.Expression): t.ObjectExpression {
  return t.objectExpression([t.objectProperty(t.identifier('box'),
    e === null || e === undefined ?
    t.unaryExpression('void', t.numericLiteral(0)) : e)]);
}

function unbox(e: t.Expression): t.Expression {
  const res = t.memberExpression(e, t.identifier('box'));
  (<any>res).mark = (<any>e).mark;
  return res;
}

/**
 * Produces 'true' if the identifier should be boxed.
 *
 * @param x an identifier
 * @param path the path to the enclosing Function or Program
 */
function shouldBox(binding: Binding, path: NodePath<t.Function | t.Program>): boolean {
  if (binding.path.isFunctionDeclaration()) {
    return true;
  }
  if (path.node.type === 'FunctionExpression' &&
      path.node.id &&
      path.node.id.name === binding.identifier.name) {
    return false;
  }
  return (freeIds.isNestedFree(path, binding.identifier.name));
}

function liftDecl(self: State, decl: t.Statement): void {
  self.liftDeclStack[self.liftDeclStack.length - 1].push(decl);
}

function liftAssign(self: State, assign: t.Statement): void {
  self.liftAssignStack[self.liftAssignStack.length - 1].push(assign);
}

  // NOTE(arjun): The following implements non-strict semantics, where
  // arguments[i] and the ith formal argument are aliased. Recall that:
  //
  // > function F(x) { 'use strict'; arguments[0] = 100; return x }; F(200)
  // 200
  // > function F(x) { arguments[0] = 100; return x }; F(200)
  // 100
  //
  // if (usesArgs) {
  //   params.forEach((x, i) => {
  //     if (boxedArgs.contains(x.name)) {
  //       const arg = t.identifier('argument');
  //       const init = t.assignmentExpression('=',
  //         t.memberExpression(arg, t.numericLiteral(i), true),
  //         x);
  //       path.node.body.body.unshift(t.expressionStatement(init));
  //     }
  //   });
  // }


function enterFunction(self: State, path: NodePath<t.FunctionExpression>) {
    const locals = Set.of(...Object.keys(path.scope.bindings));
    // Mutable variables from this scope that are not shadowed
    const vars0 = self.vars.subtract(locals);
    // Mutable variables from the inner scope
    const vars1 = locals.filter(x => shouldBox(path.scope.bindings[x!], path)).toSet();

    const params = <t.Identifier[]>path.node.params;
    const boxedArgs = Set.of(...params.filter(x => vars1.includes(x.name))
      .map(x => x.name));

   (<any>path.node).boxedArgs = boxedArgs;
    self.parentPathStack.push(self.parentPath);
    self.varsStack.push(self.vars);
    self.parentPath = path;
    self.vars = vars0.union(vars1);

  self.liftDeclStack.push([]);
  self.liftAssignStack.push([]);
}

function exitFunction(self: State, path: NodePath<t.FunctionExpression>) {
  // Lift boxed declarations and hoisted function decl assignments.
  const decls = self.liftDeclStack.pop();
  const assigns = self.liftAssignStack.pop();

  path.node.body.body.unshift(...decls!, ...assigns!);

  // Box arguments if necessary. We do this after visiting the function
  // body or the initialization statements get messed up.
  (<any>path.node).boxedArgs.valueSeq().forEach((x: string) => {
    const init = t.expressionStatement(
      t.assignmentExpression(
        "=", t.identifier(x), box(t.identifier(x!))));
    (<any>init).__boxVarsInit__ = true;
    path.node.body.body.unshift(init);
  });
  self.vars = self.varsStack.pop()!;
  self.parentPath = self.parentPathStack.pop()!;
}

const visitor = {
  Program: {
    enter(this: State, path: NodePath<t.Program>): void {
      this.parentPathStack = [];
      this.varsStack = [];
      this.parentPath = path;
      // Stopify has used the top-level as a implicit continuation delimiter.
      // i.e., Stopify's continuations are like Racket continuations, which
      // don't capture the rest of a module:
      //
      // (define saved #f)
      // (define f (call/cc (lambda (k) (set! saved k) 100)))
      // (display 200)
      // ; Applying saved will not run (display 200) again
      //
      // Since continuations don't capture top-level definitions, we do not
      // need to box top-level assignable variables, which why we initialize
      // this.vars to the empty set.
      //
      // Note that boxing top-level assignables is also wrong: a boxed top-level
      // variable X is also available as window.X, which we would not know to
      // unbox.
      /**this.vars = Set<string>();**/
      const vars = Object.keys(path.scope.bindings)
        .filter(x => shouldBox(path.scope.bindings[x], path));
      this.vars = Set.of(...vars);
      this.liftDeclStack = [[]];
      this.liftAssignStack = [[]];
    },

    exit(this: State, path: NodePath<t.Program>): void {
      const decls = this.liftDeclStack.pop();
      const assigns = this.liftAssignStack.pop();

      if (this.liftDeclStack.length !== 0 ||
        this.liftAssignStack.length !== 0) {
        throw new Error(`Not all declarations or assignments lifted \
during boxing`);
      }

      path.node.body.unshift(...decls!, ...assigns!);
    }
  },

  ReferencedIdentifier(this: State, path: NodePath<t.Identifier>) {
    path.skip();
    // NOTE(arjun): The parent type tests are because labels are
    // categorized as ReferencedIdentifiers, which is a bug in
    // Babel, in my opinion.
    if (path.parent.type === "BreakStatement" ||
        path.parent.type === 'ContinueStatement' ||
        path.parent.type === "LabeledStatement") {
      return;
    }
    if (this.vars.includes(path.node.name) ||
      (this.opts.boxes && this.opts.boxes.includes(path.node.name))) {
      path.replaceWith(unbox(path.node));
    }
  },

  VariableDeclaration(this: State, path: NodePath<t.VariableDeclaration>) {
    assert(path.node.declarations.length === 1,
      'variable declarations must have exactly one binding');
    const decl = path.node.declarations[0];
    if (decl.id.type !== "Identifier") {
      throw new assert.AssertionError({
        message: 'destructuring not supported'
      });
    }
    if (this.vars.includes(decl.id.name)) {
      liftDecl(this, t.variableDeclaration('var',
        [t.variableDeclarator(decl.id, box(h.eUndefined))]));
      if (decl.init === null) {
        path.remove();
      }
      else {
        path.replaceWith(t.assignmentExpression('=', decl.id, decl.init));
      }
    }
  },

  BindingIdentifier(this: State, path: NodePath<t.Identifier>) {
    path.skip();
    if (path.parent.type !== "AssignmentExpression") {
      return;
    }
    if (this.vars.includes(path.node.name) ||
      (this.opts.boxes && this.opts.boxes.includes(path.node.name))) {
      path.replaceWith(unbox(path.node));
    }
  },

  FunctionExpression: {
    enter(this: State, path: NodePath<t.FunctionExpression>, state: any) {
      enterFunction(this, path);
    },
    exit(this: State, path: NodePath<t.FunctionExpression>, state: any) {
      exitFunction(this, path);
    }
  },

  FunctionDeclaration: {
    enter(this: State, path: NodePath<t.FunctionExpression>, state: any) {
      enterFunction(this, path);
    },
    exit(this: State, path: NodePath<t.FunctionExpression>, state: any) {
      exitFunction(this, path);
      const vars = this.vars;
      // NOTE(rachit): in `func` mode, the input function is marked with
      // topFunction. It shouldn't be boxed since we want to preserve its
      // signature.
      if (vars.includes(path.node.id.name) &&
          !(state.opts.compileFunction && (<any>path.node).topFunction)) {
        const fun = t.functionExpression(
          fresh('fun'),
          path.node.params,
          path.node.body);

        // This is necessary to get the right function name in
        // a stack trace.
        if (path.node.id.name !== undefined) {
          (<any>fun).originalName = path.node.id.name;
        }

        (<any>fun).mark = (<any>path.node).mark;
        (<any>fun).boxedArgs = (<any>path.node).boxedArgs;

        // Little hack necessary to preserve annotation left by freeIds and singleVarDecls
        (<any>fun).nestedFunctionFree = (<any>path.node).nestedFunctionFree;
        (<any>fun).renames = (<any>path.node).renames;

        const decl = t.variableDeclaration('var',
          [t.variableDeclarator(path.node.id, box(h.eUndefined))]);
        const stmt = t.expressionStatement(t.assignmentExpression('=',
          unbox(path.node.id) as t.LVal, fun));
        liftDecl(this, decl);
        liftAssign(this, stmt);

        path.remove();
        path.skip();
      }
    }
  }
};

export function plugin() {
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
