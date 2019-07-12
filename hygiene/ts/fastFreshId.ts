/**
 * This module generates fresh identifiers much faster than Babel's
 * own functions to do so.
 */
import { NodePath } from 'babel-traverse';
import { transformFromAst } from '@stopify/util';
import * as t from 'babel-types';
import * as assert from 'assert';
const trie = require('trie'); // NOTE(arjun): No @types on 08/28/2017

let isInitialized = false;

// We populate this trie will all the identifiers in the program.
let prefixes = new trie.Trie();

interface Known {
  newBase: string,
  i: number
}

const known = new Map<String, Known>();

// NOTE(arjun): the Visitor type does not have ReferencedIdentifier
// and BindingIdentifier on 08/28/2017.
const visitor = {
  ReferencedIdentifier(path: NodePath<t.Identifier>) {
    prefixes.addWord(path.node.name);
  },
  BindingIdentifier(path: NodePath<t.Identifier>) {
    prefixes.addWord(path.node.name);
  }
};

export function plugin() {
  return { visitor: visitor };
}

export function init(path: NodePath<t.Node>): void {
  known.clear();
  transformFromAst(path, [plugin]);
  isInitialized = true;
}

export function reset(): void {
  prefixes = new trie.Trie();
  isInitialized = false;
}

export function fresh(base: string): t.Identifier {
  assert(isInitialized, 'init() must be applied before fresh()');

  const k = known.get(base);
  if (typeof k !== 'undefined') {
    const x = k.newBase + String(k.i);
    k.i = k.i + 1;
    return t.identifier(x);
  }

  let j = 0;
  let newBase = base;
  while (prefixes.isValidPrefix(newBase)) {
    newBase = newBase + String(j);
    j = j + 1;
  }
  known.set(base, { newBase: newBase, i: 1 });
  return t.identifier(newBase + String(0));
}

export function nameExprBefore(path: NodePath<t.Node>,
  expr: t.Expression, base?: string): t.Identifier {
  if (t.isIdentifier(expr)) {
    return expr;
  }
  const x = fresh(base || "x");
  path.insertBefore(
    t.variableDeclaration('let', [t.variableDeclarator(x, expr)]));
  return x;
}
