/**
 * This visitor should be ran after markFlatFunctions. It assumes that
 * function nodes have a `.mark` field that says whether or not they
 * are flat.
 */
import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { FlatTag, FlatnessMark } from '../helpers';

/**
 * 0 -> No debugging
 * 1 -> Display labels added to applications
 * 2 -> 1 + Display state of the scope structure
 */
let debug = 0;

class Scope {
  bindings: Map<string, FlatTag>;
  constructor(init: Array<[string, FlatTag]> = []) {
    this.bindings = new Map(init);
  }
  toString(): string {
    let ret = "[";
    this.bindings.forEach((k, v) => ret += `${v} -> ${k}, `);
    return ret + "]";
  }
}

class Env {
  scopes: Array<Scope>;
  constructor() {
    this.scopes = new Array(new Scope([]));

    // TODO(rachit): Add more known globals here.
    // This is not correct in presence of renaming.
    [ 'WeakMap', 'Map', 'Set', 'WeakSet', 'String', 'Number', 'Function',
      'Object', 'Array', 'Date', 'RegExp', 'Error',
      'console.*', 'Object.*', 'Math.*'
    ].map(e => this.addBinding(e, 'Flat'));
  }
  toString(): string {
    return this.scopes.map(x => x.toString()).join("\n");
  }
  findBinding(id: string): FlatTag {
    for(let iter in this.scopes) {
      let scope = this.scopes[iter];
      let res = scope.bindings.get(id);
      // This is member expression of the form a.b
      if(id.split(".").length === 2) {
        res = scope.bindings.get(id.split(".")[0] + "." + "*");
      }
      if(res) { return res; }
    }
    // NOTE(rachit): If can't find the tag, be conservative and return notflat.
    return 'NotFlat';
  }
  pushScope(scope: Scope): void {
    this.scopes.unshift(scope);
  }
  popScope(): void {
    if (this.scopes.length > 0) {
      this.scopes.shift();
    }
  }
  addBinding(id: string, tag: FlatTag): void {
    if (this.scopes.length === 0) {
      throw new Error(`Tried to add ${id} with tag ${tag} in empty Env`);
    } else {
      this.scopes[0].bindings.set(id, tag);
      this.scopes[0].bindings.set(id + '.call', tag);
      this.scopes[0].bindings.set(id + '.apply', tag);
    }
  }
}

let globalEnv = new Env();

function nodeToString(node: t.Expression | t.LVal): string | null {
  switch(node.type) {
    case 'Identifier': return node.name;
    case 'MemberExpression': {
      const oname = nodeToString(node.object);
      const pname = nodeToString(node.property);
      return oname && pname ? oname + "." + pname : null;
    }
    default: {
      return null;
    }
  }
}

/**
 * Visitors that run mark call expressions as 'flat'
 */
const markCallExpression: VisitNode<FlatnessMark<t.CallExpression>> =
  function (path: NodePath<FlatnessMark<t.CallExpression>>): void {
    if (path.node.mark === 'Flat') { return; }
    const node = path.node;
    const name = nodeToString(node.callee);
    if (name) {
      const tag: FlatTag = globalEnv.findBinding(name);
      if (debug > 0) {
        console.error(`${name} -> ${tag} on line ${path.node.loc ?
            path.node.loc.start.line : ""}`);
      }
      node.mark = tag;
      (<any>node.callee).mark = tag;
    }
  };

const programMarkCallExpression: VisitNode<FlatnessMark<t.CallExpression>> =
  function (path: NodePath<FlatnessMark<t.CallExpression>>) {
    if (path.node.mark === 'Flat') { return; }
    const fParent = path.findParent(p => t.isFunctionDeclaration(p) ||
      t.isFunctionExpression(p));
    if (fParent === null || fParent === undefined) {
      const node = path.node;
      if (t.isFunctionExpression(node.callee)) {
        node.mark = (<any>node.callee).mark;
        return;
      }
      const name = nodeToString(node.callee);
      if (name) {
        const tag: FlatTag = globalEnv.findBinding(name);
        if (debug > 0) {
          console.error(`${name} -> ${tag} on line ${path.node.loc ?
              path.node.loc.start.line : ""}`);
        }
        node.mark = tag;
        (<any>node.callee).mark = tag;
      }
    }
  };

const func: VisitNode<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>> = {
  enter(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
    let paramsBind : any =
      path.node.params.map(p => [(<t.Identifier>p).name, 'NotFlat']);
    if (path.node.id) {
      globalEnv.addBinding(path.node.id.name, path.node.mark);
      // The function name is bound to its own mark and all the params are
      // marked as not flat.
      let binds = [ [path.node.id.name, path.node.mark], ...paramsBind ];
      globalEnv.pushScope(new Scope(binds));
    } else {
      globalEnv.pushScope(new Scope(paramsBind));
    }
  },

  exit(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
    if(debug > 1) {
      console.error(`\n-------${path.node.id.name}----------`);
      console.error(globalEnv.toString());
      console.error(`\n-------------------------`);
    }
    path.traverse(markingVisitor);
    globalEnv.popScope();
  }
};

const assign = {
  // NOTE(rachit): This naively assumes that all IDs that are assigned to
  // are not flat. A better alternative to this is to check if the assignment
  // is itself a flat function and give a tag accordingly.
  enter(path: NodePath<FlatnessMark<t.AssignmentExpression>>) {
    const name = nodeToString(path.node.left);
    if (name) {
      globalEnv.addBinding(name, 'NotFlat');
      if (debug > 0) {
        console.error(`${name} -> NotFlat on line ${path.node.loc ?
            path.node.loc.start.line : ""} because of assignment`);
      }
    }
  }
};

const program: VisitNode<t.Program> = {
  enter(path: NodePath<t.Program>) {
    globalEnv = new Env();
  },
  exit(path: NodePath<t.Program>) {
    if (debug > 1) {
      console.error(`\n-------program----------`);
      console.error(globalEnv.toString());
      console.error(`\n-------------------------`);
    }
    path.traverse(programMarkingVisitor);
  }
};

// The Program visitor needs to ignore all function bodies
const programMarkingVisitor = {
  CallExpression: programMarkCallExpression,
  NewExpression: programMarkCallExpression
} as Visitor;

const markingVisitor = {
  CallExpression: markCallExpression,
  NewExpression: markCallExpression
} as Visitor;

const visitor: Visitor = {
  Program: program,
  FunctionDeclaration: <any>func,
  FunctionExpression: <any>func,
  AssignmentExpression: assign,
};

export function markFlatApplications() {
  return { visitor };
}
