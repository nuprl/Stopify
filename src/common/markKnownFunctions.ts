import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { Tag, OptimizeMark } from './helpers';

class Scope {
  bindings: Map<string, Tag>;
  constructor(init: Array<[string, Tag]> = []) {
    this.bindings = new Map(init)
  }
  toString() {
    return this.bindings.toString()
  }
}

class Env {
  scopes: Array<Scope>;
  constructor() {
    this.scopes = new Array(new Scope([]));

    // NOTE(rachit): Add more known globals here.
    [
      'WeakMap', 'Map', 'Set', 'WeakSet', 'String', 'Number', 'Function',
      'Object', 'Array', 'Date', 'RegExp', 'Error', 'Object.create',
      'console.log', 'console.dir'
    ].map(e => this.addBinding(e, 'Untransformed'))
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

function nodeToString(node: t.Expression): string | null {
  switch(node.type) {
    case 'Identifier': return node.name;
    case 'MemberExpression': {
      let l = nodeToString(node.object)
      let r = nodeToString(node.property)
      if (l && r) {
        return l + '.' + r;
      } else {
        return null;
      }
    }
    default: {
      return null
    }
  }
}

const markCallExpression: VisitNode<OptimizeMark<t.CallExpression>> =
  function (path: NodePath<OptimizeMark<t.CallExpression>>): void {
    const node = path.node
    const name = nodeToString(node.callee)
    if (name) {
      const tag: Tag = globalEnv.findBinding(name)
      node.OptimizeMark = tag
    }
  }

const markLetBoundFuncExpr: VisitNode<OptimizeMark<t.FunctionExpression>> = {
  enter (path: NodePath<OptimizeMark<t.FunctionExpression>>): void {
    const decl = path.parent;
    if(t.isVariableDeclarator(decl)) {
      globalEnv.addBinding((<t.Identifier>decl.id).name, 'Transformed')
    }
  }
}

const functionDeclaration: VisitNode<OptimizeMark<t.FunctionDeclaration>> = {
  enter (path: NodePath<OptimizeMark<t.FunctionDeclaration>>): void {
    if (path.node.id) {
      globalEnv.addBinding(path.node.id.name, 'Transformed');
      globalEnv.pushScope(new Scope([[path.node.id.name, 'Transformed']]))
    } else {
      globalEnv.pushScope(new Scope([]));
    }
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
  "CallExpression|NewExpression": markCallExpression,
}

const visitor = {
  Program: program,
  "FunctionDeclaration|FunctionExpression": functionDeclaration,
}

module.exports = function () {
  return { visitor };
}
