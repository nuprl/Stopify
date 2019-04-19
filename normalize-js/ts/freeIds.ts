/**
 * This module annotates the AST with the following information:
 *
 * 1. All scopeable nodes are annotated with a set of free identifiers.
 * 2. All function and program nodes are annotated with the set of
 *    free identifiers in their enclosing functions.
 */
import * as t from '@babel/types';
import * as babel from '@babel/core';
import { Visitor } from './types';
import { NodePath } from '@babel/traverse';
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

const visitor : Visitor<State> = {
  Scopable: {
    enter(path) {
      (path.node as any as NestedFunctionFree).nestedFunctionFree = new Set<string>();

      this.refIdStack.push(this.refIds);
      this.refIds = new Set();
    },
    exit(path) {
      const boundIds = new Set<string>(Object.keys(path.scope.bindings));
      let freeIds = SetExt.diff(this.refIds, boundIds);
      (path.node as any as FreeIds).freeIds = freeIds;
      this.refIds = this.refIdStack.pop()!;
      for (const x of freeIds) {
        this.refIds.add(x);
      }
      if (functionTypes.includes(path.node.type)) {
        const parent = enclosingFunction(path);
        const nestedFunctionFree = parent.node.nestedFunctionFree;
        for (const x of (path.node as any as FreeIds).freeIds) {
          nestedFunctionFree.add(x);
        }
      }

    }
  },
  ReferencedIdentifier(path) {
    const parentType = path.parent.type;
    if (parentType === "BreakStatement" ||
        parentType === 'ContinueStatement' ||
        parentType === "LabeledStatement") {
      return;
    }
    this.refIds.add(path.node.name);
  },
  BindingIdentifier(path) {
    const parentType = path.parent.type;
    if (parentType !== "AssignmentExpression") {
      return;
    }
    this.refIds.add(path.node.name);
  },
  Program(path) {
    (path.node as any).nestedFunctionFree = new Set<string>();
    this.refIdStack = [];
    this.refIds = new Set<string>();
  }
};

export function annotate(path: NodePath<t.Node>) {
  (path.node as any as NestedFunctionFree).nestedFunctionFree = new Set<string>();
  babel.traverse(path.parent, visitor, path.scope, { refIdStack: [], refIds: new Set<string>() });
}

export function enclosingFunction(path: NodePath<t.Node>): NodePath<(t.Function | t.Program) & NestedFunctionFree> {
  const p = path.findParent(p => hasNff.includes(p.node.type));
  return <any>p;
}

export function isNestedFree(
  path: NodePath<t.Function | t.Program>,
  x: string): boolean {
    let node = path.node as any as NestedFunctionFree;
    return node.nestedFunctionFree.has(x);
}
