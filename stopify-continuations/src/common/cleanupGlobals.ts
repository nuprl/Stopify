/*
 * This visitor introduces declarations for any free identifiers in a
 * program.  Some older benchmarks, such as SunSpider, have free
 * identifiers and this helps us tackle them without modification.
 * The visitor takes an argument with a list of allowed free variables.
 * For example, most programs will allow "require".
 *
 * Example use:
 *
 *   import cleanupGlobal from '../common/cleanupGlobals.ts';
 *   const plugin = [ cleanupGlobal, { reserved: [ "require" ] } ];
 *   babel.transform(src, { plugins: [plugin], babelrc: false });
 */
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as fs from 'fs';

interface S {
  found: Set<string>,
  allowed: Set<string>
}
// We use BindingIdentifier and ReferencedIdentifier in this visitor,
// but are is not part of the TypeScript type definition. The problem
// with using just Identifier is that it also visits non-computed
// field lookup expressions.
const visitIdentifiers = {
  // BindingIdentifier is a misnomer.
  BindingIdentifier({ scope, node: { name } }: NodePath<t.Identifier>,
                    { found, allowed }: S) {
    if (!allowed.has(name) && !scope.hasBinding(name)) {
      found.add(name);
    }
  },
  ReferencedIdentifier({ scope, node: { name } }: NodePath<t.Identifier>,
                       { found, allowed }: S) {
    if (!allowed.has(name) && !scope.hasBinding(name)) {
      found.add(name);
    }
  }
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const found = new Set();
    const allowed = new Set(state.opts.allowed || []);
    path.traverse(visitIdentifiers, { found, allowed });
    for (const x of found.values()) {
      path.node.body.unshift(
        t.variableDeclaration("var", [t.variableDeclarator(t.identifier(x))]));

    }
  }
}

export default function() {
  return { visitor: visitor };
}

// Runs this plugin standalone.
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
