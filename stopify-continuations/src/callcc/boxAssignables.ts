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
import { NodePath } from 'babel-traverse';
import * as freeIds from '../common/freeIds';
import * as fastFreshId from '../fastFreshId';
import * as bh from '../babelHelpers';
import { Set } from 'immutable';

type Parent = t.Program | t.FunctionDeclaration | t.FunctionExpression;

type State = {
  parentPath: NodePath<Parent>,
  vars: Set<string>,
  parentPathStack: NodePath<Parent>[],
  varsStack: Set<string>[],
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
function shouldBox(x: string, path: NodePath<t.Function | t.Program>): boolean {
  if (path.node.type === 'FunctionExpression' &&
      path.node.id &&
      path.node.id.name === x) {
    return false;
  }
  return (freeIds.isNestedFree(path, x));
}

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
    const vars1 = locals.filter(x => shouldBox(x!, path)).toSet();

    const params = <t.Identifier[]>path.node.params;
    const boxedArgs = Set.of(...params.filter(x => vars1.includes(x.name))
      .map(x => x.name));

   (<any>path.node).boxedArgs = boxedArgs;
    self.parentPathStack.push(self.parentPath);
    self.varsStack.push(self.vars);
    self.parentPath = path;
    self.vars = vars0.union(vars1);
}

function exitFunction(self: State, path: NodePath<t.FunctionExpression>) {
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
  Scope: {
    exit(this: State, path: NodePath<t.Scopable>): void {
      (<any>path.node).boxed = this.vars;
    },
  },

  Program(this: State, path: NodePath<t.Program>, state: any) {
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
    this.vars = Set<string>();
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
      liftStatement(this.parentPath, path,
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
      const parentPath = this.parentPath;
      // NOTE(rachit): in `func` mode, the input function is marked with
      // topFunction. It shouldn't be boxed since we want to preserve its
      // signature.
      if (vars.includes(path.node.id.name) &&
          !(state.opts.compileFunction && (<any>path.node).topFunction)) {
        const fun = t.functionExpression(
          fastFreshId.fresh('fun'),
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
        const stmt = t.variableDeclaration("var",
          [t.variableDeclarator(path.node.id, box(fun))]);
        liftStatement(parentPath, path, stmt);
        path.remove();
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
