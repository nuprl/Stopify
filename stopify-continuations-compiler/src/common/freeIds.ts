/**
 * This module annotates the AST with the following information:
 *
 * 1. All scopeable nodes are annotated with a set of free identifiers.
 * 2. All function and program nodes are annotated with the set of
 *    free identifiers in their enclosing functions.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as SetExt from "./setExt";

export interface NestedFunctionFree {
  nestedFunctionFree: Set<string>,
}

interface FreeIds {
  freeIds: Set<string>
}

interface State {
  refIds: Set<string>,
  refIdStack: Set<string>[]
}

const hasNff = [ "FunctionDeclaration", "FunctionExpression", "Program" ];
const functionTypes = [ 'FunctionDeclaration', 'FunctionExpression' ];

const visitor = {
  Scope: {
    enter(this: State, path: NodePath<t.Scopable & NestedFunctionFree>) {
      path.node.nestedFunctionFree = new Set<string>();
      this.refIdStack.push(this.refIds);
      this.refIds = new Set();
    },
    exit(this: State, path: NodePath<t.Scopable & FreeIds & NestedFunctionFree>) {
      const boundIds = new Set<string>(Object.keys(path.scope.bindings));
      let freeIds = SetExt.diff(this.refIds, boundIds);
      path.node.freeIds = freeIds;
      this.refIds = this.refIdStack.pop()!;
      for (const x of freeIds) {
        this.refIds.add(x);
      }

      if (functionTypes.includes(path.node.type)) {
        const parent = enclosingFunction(path);
        const nestedFunctionFree = parent.node.nestedFunctionFree;
        for (const x of path.node.freeIds) {
          nestedFunctionFree.add(x);
        }
      }

    }
  },
  ReferencedIdentifier(this: State, path: NodePath<t.Identifier>) {
    const parentType = path.parent.type;
    if (parentType === "BreakStatement" ||
        parentType === 'ContinueStatement' ||
        parentType === "LabeledStatement") {
      return;
    }
    this.refIds.add(path.node.name);
  },
  BindingIdentifier(this: State, path: NodePath<t.Identifier>) {
    const parentType = path.parent.type;
    if (parentType !== "AssignmentExpression") {
      return;
    }
    this.refIds.add(path.node.name);
  },
  Program(this: State, path: NodePath<t.Program & NestedFunctionFree>) {
    path.node.nestedFunctionFree = new Set<string>();
    this.refIdStack = [];
    this.refIds = new Set<string>();
  }
};

export function annotate(path: NodePath<t.Node>) {
  const opts = {
    plugins: [ [() => ({visitor})] ],
    babelrc: false,
    code: false,
    ast: false
  };
  babel.transformFromAst(path.node, undefined, opts);
}

export function enclosingFunction(path: NodePath<t.Node>): NodePath<(t.Function | t.Program) & NestedFunctionFree> {
  const p = path.findParent(p => hasNff.includes(p.node.type));
  return <any>p;
}

export function isNestedFree(
  path: NodePath<t.Function | t.Program>,
  x: string): boolean {
    return (<any>path.node).nestedFunctionFree.has(x);
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
