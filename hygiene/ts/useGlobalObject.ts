/**
 * This module transforms programs to use `$S.g` as the global object. We use
 * the following algorithm:
 * 
 * 1. At the top-level, transform `var x = e` into `$S.g.x = e`.
 * 2. At the start of the program, insert the statement `$S.g.f = f`
 *    for each top-level `function f(...) { ... }`.  i.e., function declarations
 *    are still lifted as expected.
 * 3. Track the set of identifiers bound at non-global scopes.
 * 4. If `x` is a non-binding occurrence of an identifier that isn't in the
 *    set of identifiers tracked in Step 3, transform `x` into `$S.g.x`.
 */

import * as t from 'babel-types';
import { NodePath } from 'babel-traverse';

export const $S = t.identifier('$S');
// export const $S_g = t.memberExpression($S, t.identifier('g'), false);

type S = {
  boundIds: Set<string>,
  boundIdStack: Set<string>[],
  programBody: t.Statement[],
  opts: {
    global: t.Expression
  }
};

/** Produces the statement `$S.g.name = expr`. */
function setGlobal(global: t.Expression, name: t.Identifier, expr: t.Expression): t.Statement {
  return t.expressionStatement(
    t.assignmentExpression('=',
      t.memberExpression(global, name, false),
      expr));
}

function visitId(path: NodePath<t.Identifier>, state: S) {
  if (path.node.name === $S.name ||
      state.boundIds.has(path.node.name)) {
    return;
  }

  const newNode = t.memberExpression(state.opts.global, path.node, false);

  if ((path.node as any).mark) {
    (newNode as any).mark = (path.node as any).mark;
  }

  path.replaceWith(newNode);
  path.skip();
}

const visitor = {
  Program(path: NodePath<t.Program>, state: S) {
    state.boundIds = new Set(['arguments']);
    state.boundIdStack = [];
    state.programBody = path.node.body;
  },
  VariableDeclaration: {
    enter(path: NodePath<t.VariableDeclaration>, state: S) {
      const isGlobal = state.boundIdStack.length === 0;
      if (!isGlobal) {
        return;
      }
      const nodes: t.Statement[] = [];
      for (const declarator of path.node.declarations) {
        if (declarator.id.type !== 'Identifier') {
          throw new Error(`Stopify does not support patterns, found
                           ${declarator.id.type}`);
        }
        if (declarator.init === null) {
          continue;
        }
        nodes.push(t.expressionStatement(
          t.assignmentExpression('=', declarator.id, declarator.init)));
      }
      path.replaceWithMultiple(nodes);
    }
  },
  FunctionDeclaration(path: NodePath<t.FunctionDeclaration>, state: S) {
    // NOTE(arjun): This kind of path traversal may slow down Stopify.
    // A better approach may to be maintain a stack.
    const isGlobal = state.boundIdStack.length === 0;
    if (!isGlobal) {
      return;
    }

    state.programBody.unshift(setGlobal(state.opts.global, path.node.id, path.node.id));
  },
  // Track the set of identifiers bound at all scopes, *except* for Program.
  Scope: {
    enter(path: NodePath<t.Scopable>, state: S) {
      if (path.node.type === 'Program') {
        return;
      }
      state.boundIdStack.push(state.boundIds);
      const newIds = Object.keys(path.scope.bindings);
      const oldIds = state.boundIds.values(); 
      state.boundIds = new Set([...newIds, ...oldIds]);
    },
    exit(path: NodePath<t.Scopable>, state: S) {
      if (path.node.type === 'Program') {
        return;
      }
      state.boundIds = state.boundIdStack.pop()!;
    }
  },
  BindingIdentifier: {
    exit(path: NodePath<t.Identifier>, state: S) {
      // This is *not* a binding occurence! The Babel AST is wrong.
      if (path.parent.type !== 'AssignmentExpression') {
        return;
      }
      visitId(path, state);
    }
  },
  // Transforms non-binding occurrences of identifiers that are in the
  // set of identifiers tracked above.
  ReferencedIdentifier: {
    exit(path: NodePath<t.Identifier>, state: S) {
      // The following three clauses only exist because the Babel AST treats
      // labels as identifiers.
      if (path.parent.type === 'ContinueStatement' ||
          path.parent.type === 'BreakStatement' ||
          path.parent.type === 'LabelledStatement') {
        return;
      }

      //`arguments` is a special keyword that is implicitly defined within
      //function scopes.
      if (path.node.name === 'arguments') {
        return;
      }

      visitId(path, state);
    }
  },
  // Transforms calls to global functions f(x ...) to f.call(void 0, x ...).
  // Without this step, the call would turn into $S.g.f(x ...), which binds
  // this to $S.g within the body of f. Stopify tries to implement strict-mode,
  // so this would be a bad thing.
  CallExpression(path: NodePath<t.CallExpression>, state: S) {
    const fun = path.node.callee;
    if (!(fun.type === 'Identifier' && !state.boundIds.has(fun.name))) {
      return;
    }
    // Calling a global function. T
    path.node.callee = t.memberExpression(path.node.callee, 
      t.identifier('call'), false);
    path.node.arguments = [ t.unaryExpression('void', t.numericLiteral(0)),
      ...path.node.arguments ];
  }
};

export function plugin() {
  return { visitor: visitor };
}
