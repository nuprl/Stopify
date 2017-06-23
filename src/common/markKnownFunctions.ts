import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { Tag, OptimizeMark } from './helpers';
import generate from 'babel-generator'

let debug = false;

class Scope {
  bindings: Map<string, Tag>;
  constructor(init: Array<[string, Tag]> = []) {
    this.bindings = new Map(init)
  }
  toString(): string {
    let ret = "["
    this.bindings.forEach((k, v) => ret += `${v} -> ${k}, `)
    return ret + "]"
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
      'console.log', 'console.dir', 'Object.assign'
    ].map(e => this.addBinding(e, 'Untransformed'))
  }
  toString(): string {
    return this.scopes.map(x => x.toString()).join("\n")
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
      if (debug) {
        process.stderr.write(`${name} -> ${tag} on line ${path.node.loc ?
            path.node.loc.start.line : ""}\n`)
      }
      node.OptimizeMark = tag
    }
  }

const programMarkCallExpression: VisitNode<OptimizeMark<t.CallExpression>> =
  function (path: NodePath<OptimizeMark<t.CallExpression>>): void {
    const fParent = path.findParent(p => t.isFunctionDeclaration(p) ||
      t.isFunctionExpression(p))
    if (fParent === null || fParent === undefined) {
      const node = path.node
      // Known for a fact that all function expression are transformed.
      if (t.isFunctionExpression(node.callee)) {
        node.OptimizeMark = 'Transformed'
        return
      }
      const name = nodeToString(node.callee)
      if (name) {
        const tag: Tag = globalEnv.findBinding(name)
        if (debug) {
          process.stderr.write(`${name} -> ${tag} on line ${path.node.loc ?
              path.node.loc.start.line : ""}\n`)
        }
        node.OptimizeMark = tag
      }
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

const func: VisitNode<OptimizeMark<t.FunctionDeclaration|t.FunctionExpression>> = {
  enter (path: NodePath<OptimizeMark<t.FunctionDeclaration|t.FunctionExpression>>): void {
    if (path.node.id) {
      globalEnv.addBinding(path.node.id.name, 'Transformed');
      globalEnv.pushScope(new Scope([[path.node.id.name, 'Transformed']]))
    } else {
      globalEnv.pushScope(new Scope([]));
    }
  },

  exit (path: NodePath<OptimizeMark<t.FunctionDeclaration|t.FunctionExpression>>): void {
    if(debug) {
      process.stderr.write(`\n-------${path.node.id.name}----------\n`)
      process.stderr.write(globalEnv.toString())
      process.stderr.write(`\n-------------------------\n`)
    }
    path.traverse(markingVisitor)
    globalEnv.popScope();
  }
}

const program: VisitNode<t.Program> = {
  exit(path) {
    if (debug) {
      process.stderr.write(`\n-------program----------\n`)
      process.stderr.write(globalEnv.toString())
      process.stderr.write(`\n-------------------------\n`)
    }
    path.traverse(programMarkingVisitor);
  }
}

// The Program visitor needs to ignore all function bodies
const programMarkingVisitor = {
  "CallExpression|NewExpression": programMarkCallExpression
}

const markingVisitor = {
  "CallExpression|NewExpression": markCallExpression,
}

const visitor = {
  Program: program,
  FunctionDeclaration: func,
  FunctionExpression: func,
}

module.exports = function () {
  return { visitor };
}
