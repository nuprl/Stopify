/**
 * This visitor should be ran after markFlatFunctions. It assumes that
 * function nodes have a `.mark` field that says whether or not they
 * are flat.
 */
import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { FlatTag, FlatnessMark } from './helpers';

/**
 * 0 -> No debugging
 * 1 -> Display labels added to applications
 * 2 -> 1 + Display state of the scope structure
 */
let debug = 0;

class Scope {
  bindings: Map<string, FlatTag>;
  constructor(init: Array<[string, FlatTag]> = []) {
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

    // TODO(rachit): Add more known globals here.
    // This is not correct in presence of renaming.
    [
      'WeakMap', 'Map', 'Set', 'WeakSet', 'String', 'Number', 'Function',
      'Object', 'Array', 'Date', 'RegExp', 'Error', 'Object.create',
      'console.log', 'console.dir', 'Object.assign'
    ].map(e => this.addBinding(e, 'Flat'))
  }
  toString(): string {
    return this.scopes.map(x => x.toString()).join("\n")
  }
  findBinding(id: string): FlatTag {
    for(let iter in this.scopes) {
      let scope = this.scopes[iter]
      let res = scope.bindings.get(id)
      if(res) return res;
    }
    // NOTE(rachit): If can't find the tag, be conservative and return notflat.
    return 'NotFlat'
  };
  pushScope(scope: Scope): void {
    this.scopes.unshift(scope)
  };
  popScope(): void {
    if (this.scopes.length > 0) {
      this.scopes.shift()
    }
  };
  addBinding(id: string, tag: FlatTag): void {
    if (this.scopes.length === 0) {
      throw new Error(`Tried to add ${id} with tag ${tag} in empty Env`)
    } else {
      this.scopes[0].bindings.set(id, tag)
      this.scopes[0].bindings.set(id + '.call', tag)
      this.scopes[0].bindings.set(id + '.apply', tag)
    }
  }
}

let globalEnv = new Env();

function nodeToString(node: t.Expression | t.LVal): string | null {
  switch(node.type) {
    case 'Identifier': return node.name;
    default: {
      return null
    }
  }
}

/**
 * Visitors that run mark call expressions as 'flat'
 */
const markCallExpression: VisitNode<FlatnessMark<t.CallExpression>> =
  function (path: NodePath<FlatnessMark<t.CallExpression>>): void {
    const node = path.node
    const name = nodeToString(node.callee)
    if (name) {
      const tag: FlatTag = globalEnv.findBinding(name)
      if (debug > 0) {
        console.error(`${name} -> ${tag} on line ${path.node.loc ?
            path.node.loc.start.line : ""}`)
      }
      node.mark = tag
    }
  }

const programMarkCallExpression: VisitNode<FlatnessMark<t.CallExpression>> =
  function (path: NodePath<FlatnessMark<t.CallExpression>>) {
    const fParent = path.findParent(p => t.isFunctionDeclaration(p) ||
      t.isFunctionExpression(p))
    if (fParent === null || fParent === undefined) {
      const node = path.node
      if (t.isFunctionExpression(node.callee)) {
        node.mark = (<any>node.callee).mark
        return
      }
      const name = nodeToString(node.callee)
      if (name) {
        const tag: FlatTag = globalEnv.findBinding(name)
        if (debug > 0) {
          console.error(`${name} -> ${tag} on line ${path.node.loc ?
              path.node.loc.start.line : ""}`)
        }
        node.mark = tag
      }
    }
  }

/**
 * Visitors that collect 'flat' tags from previously marked functions
 */
const markLetBoundFuncExpr: VisitNode<FlatnessMark<t.FunctionExpression>> = {
  enter (path: NodePath<FlatnessMark<t.FunctionExpression>>) {
    const decl = path.parent;
    if(t.isVariableDeclarator(decl)) {
      globalEnv.addBinding((<t.Identifier>decl.id).name, path.node.mark)
    }
  }
}

const func: VisitNode<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>> = {
  enter(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
    let paramsBind : any =
      path.node.params.map(p => [(<t.Identifier>p).name, 'NotFlat'])
    if (path.node.id) {
      globalEnv.addBinding(path.node.id.name, path.node.mark);
      // The function name is bound to its own mark and all the params are
      // marked as not flat.
      let binds = [ [path.node.id.name, path.node.mark], ...paramsBind ]
      globalEnv.pushScope(new Scope(binds))
    } else {
      globalEnv.pushScope(new Scope(paramsBind));
    }
  },

  exit(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
    if(debug > 1) {
      console.error(`\n-------${path.node.id.name}----------`)
      console.error(globalEnv.toString())
      console.error(`\n-------------------------`)
    }
    path.traverse(markingVisitor)
    globalEnv.popScope();
  }
}

const assign = {
  // NOTE(rachit): This naively assumes that all IDs that are assigned to
  // are not flat. A better alternative to this is to check if the assignment
  // is itself a flat function and give a tag accordingly.
  enter(path: NodePath<FlatnessMark<t.AssignmentExpression>>) {
    const name = nodeToString(path.node.left)
    if (name) {
      const tag = globalEnv.addBinding(name, 'NotFlat')
      if (debug > 0) {
        console.error(`${name} -> NotFlat on line ${path.node.loc ?
            path.node.loc.start.line : ""} because of assignment`)
      }
    }
  }
}

const program: VisitNode<t.Program> = {
  enter(path) {
    globalEnv = new Env()
  },
  exit(path) {
    if (debug > 1) {
      console.error(`\n-------program----------`)
      console.error(globalEnv.toString())
      console.error(`\n-------------------------`)
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
  AssignmentExpression: assign,
}

export default function () {
  return { visitor };
}
