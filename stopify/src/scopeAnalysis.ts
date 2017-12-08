/**
 * This module annotates the Program and every Function with (a) its
 * free identifiers and (2) its local assignable identifiers.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import { Set } from 'immutable';

export type T = {
  assignableIds: Set<string>,
  freeIds: Set<string>
}

type S = {
  referencedIds: Set<string>,
  assignedIds: Set<string>,
  referencedIdsStack: Set<string>[],
  assignedIdsStack: Set<string>[],
}

function genericEnter(self: S, node: t.Node & T) {
  self.referencedIdsStack.push(self.referencedIds);
  self.assignedIdsStack.push(self.assignedIds);
  self.referencedIds = Set<string>();
  self.assignedIds = Set<string>();
}

function genericExit(self: S, locals: Set<string>, node: t.Node & T) {
  node.freeIds = self.referencedIds.subtract(locals);
  node.assignableIds = self.assignedIds.subtract(node.freeIds);
  self.referencedIds = self.referencedIdsStack.pop()!;
  self.assignedIds = self.assignedIdsStack.pop()!;
}


const visitor = {
  ReferencedIdentifier(this: S, path: NodePath<t.Identifier>) {
    const parentType = path.parent.type;
    if (parentType === "BreakStatement" ||
        parentType === 'ContinueStatement' ||
        parentType === "LabeledStatement") {
      return;
    }
    this.referencedIds = this.referencedIds.add(path.node.name);
  },
  AssignmentExpression(this: S, path: NodePath<t.AssignmentExpression>) {
    if (path.node.left.type !== 'Identifier') {
      return;
    }
    this.assignedIds = this.assignedIds.add(path.node.left.name);
  },
  ObjectMethod: {
    enter(this: S, path: NodePath<t.ObjectMethod & T>) {
      genericEnter(this, path.node);
    },
    exit(this: S, path: NodePath<t.ObjectMethod & T>) {
      genericExit(this, Set(Object.keys(path.scope.bindings)), path.node);
    }
  },
  FunctionExpression: {
    enter(this: S, path: NodePath<t.FunctionExpression & T>) {
      genericEnter(this, path.node);
    },
    exit(this: S, path: NodePath<t.FunctionExpression & T>) {
      genericExit(this, Set(Object.keys(path.scope.bindings)), path.node);
    }
  },
  FunctionDeclaration: {
    enter(this: S, path: NodePath<t.FunctionDeclaration & T>) {
      genericEnter(this, path.node);
    },
    exit(this: S, path: NodePath<t.FunctionDeclaration & T>) {
      genericExit(this, Set(Object.keys(path.scope.bindings)), path.node);
    }
  },
  Program: {
    enter(this: S, path: NodePath<t.Program & T>) {
      this.referencedIdsStack = [];
      this.assignedIdsStack = [];
      this.referencedIds = Set<string>();
      this.assignedIds = Set<string>();
    },
    exit(this: S, path: NodePath<t.Program & T>) {
      genericExit(this, Set(Object.keys(path.scope.bindings)), path.node);
    }
  }
}
export function plugin() {
  return { visitor };
}