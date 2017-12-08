/**
 * This module annotates the AST with the following information:
 *
 * 1. All scopeable nodes are annotated with a set of free identifiers.
 * 2. All function and program nodes are annotated with the set of
 *    free identifiers in their enclosing functions.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import { Set } from 'immutable';
import * as SA from '../scopeAnalysis';

export type T = {
  escapingAIds: Set<string>
}

interface FreeIds {
  freeIds: Set<string>
}

type S = {
  nestedFreeIds: Set<string>[],
  nestedFreeIdsStack: Set<string>[][]
}
function genericEnter(self: S, path: NodePath<t.Node & SA.T & T>) {
  self.nestedFreeIds.push(path.node.freeIds);
  self.nestedFreeIdsStack.push(self.nestedFreeIds);
  self.nestedFreeIds = [];
}

function genericExit(self: S, path: NodePath<t.Node & SA.T & T>) {
  path.node.escapingAIds =
    path.node.assignableIds.intersect(...self.nestedFreeIds);
  self.nestedFreeIds = self.nestedFreeIdsStack.pop()!;
}

const visitor = {
  Function: {
    enter(this: S, path: NodePath<t.Function & SA.T & T>) {
      genericEnter(this, path);
    },
    exit(this: S, path: NodePath<t.Function & SA.T & T>) {
      genericExit(this, path);
    }
  },
  Program: {
    enter(this: S, path: NodePath<t.Program & SA.T & T>) {
      this.nestedFreeIds = [];
      this.nestedFreeIdsStack = [];
    },
    exit(this: S, path: NodePath<t.Program & SA.T & T>) {
      path.node.escapingAIds = Set<string>(); // wtf
    }
  }
};

export function annotate(path: NodePath<t.Node>) {
  const opts = {
    plugins: [ () => ({visitor}) ],
    babelrc: false,
    code: false,
    ast: false
  };
  babel.transformFromAst(path.node, undefined, opts);
}

export function isNestedFree(path: NodePath<t.Function | t.Program>,
  x: string): boolean {
  return (<T>(<any>path.node)).escapingAIds.contains(x);
}
