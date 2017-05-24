import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { Tag, OptimizeMark } from './helpers';

class Scope {
  bindings: Map<string, Tag>;
  constructor(init: Array<[string, Tag]> = []) {
    this.bindings = new Map(init)
  }
}

class Env {
  scopes: Array<Scope>;
  constructor() {
    const knownGlobals: Array<[string, Tag]> = [
      'WeakMap', 'Map', 'Set', 'WeakSet', 'String', 'Number', 'Function',
      'Object', 'Array', 'Date', 'RegExp', 'Error', 'Object.create',
      'console.log'
    ].map(function (e: string): [string, Tag] {
      return [e, 'Untransformed'];
    })
    const globalScope = new Scope(knownGlobals)
    this.scopes = new Array(globalScope)
  }
  findBinding(id: string): Tag {
    for(let iter in this.scopes) {
      let scope = this.scopes[iter]
      let res = scope.bindings.get(id)
      if(res) return res;
    }
    return 'Unknown'
  };
  pushScope(scope: Scope): void {
    this.scopes.unshift(scope)
  };
  popScope(): void {
    if (this.scopes.length > 0) {
      this.scopes.shift()
    }
  };
  addBinding(id: string, tag: Tag = 'Transformed'): void {
    if (this.scopes.length === 0) {
      throw new Error(`Tried to add ${id} with tag ${tag} in empty Env`)
    } else {
      this.scopes[0].bindings.set(id, tag)
      this.scopes[0].bindings.set(id + '.call', tag)
      this.scopes[0].bindings.set(id + '.apply', tag)
    }
  }
}

const globalEnv = new Env();


function nodeToString(node: t.Expression): string {
  switch(node.type) {
    case 'Identifier': return node.name;
    case 'MemberExpression': {
      return nodeToString(node.object) + '.' + nodeToString(node.property)
    }
    default: {
      throw new Error(`${node.type} in callee position, cannot convert to string`)
    }
  }
}

const markCallExpression: VisitNode<OptimizeMark<t.CallExpression>> =
  function (path: NodePath<OptimizeMark<t.CallExpression>>): void {
    const node = path.node
    const tag: Tag = globalEnv.findBinding(nodeToString(node.callee))
    node.OptimizeMark = tag
  }

const markLetBoundFuncExpr: VisitNode<OptimizeMark<t.FunctionExpression>> =
  function (path: NodePath<OptimizeMark<t.FunctionExpression>>): void {
    const decl = path.parent;
    if(t.isVariableDeclarator(decl)) {
      globalEnv.addBinding((<t.Identifier>decl.id).name, 'Transformed')
    }
  }

const functionDeclaration: VisitNode<OptimizeMark<t.FunctionDeclaration>> = {
  enter (path: NodePath<OptimizeMark<t.FunctionDeclaration>>): void {
    globalEnv.addBinding(path.node.id.name, 'Transformed');
    globalEnv.pushScope(new Scope([[path.node.id.name, 'Transformed']]))
  },

  exit (path: NodePath<OptimizeMark<t.FunctionDeclaration>>): void {
    path.traverse(markingVisitor)
    globalEnv.popScope();
  }
}

const program: VisitNode<t.Program> = {
  exit(path) {
    path.traverse(markingVisitor);
  }
}

const markingVisitor = {
  CallExpression: markCallExpression,
  FunctionExpression:  markLetBoundFuncExpr,
}

const visitor = {
  Program: program,
  FunctionDeclaration: functionDeclaration,
}

module.exports = function () {
  return { visitor };
}
