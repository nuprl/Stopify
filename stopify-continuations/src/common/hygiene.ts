/*
 * This plugin can help another plugin be hygienic (in the Scheme macro sense)
 * when introducing new names. It requires as an option an array of identifiers
 * that the program should not use and renames all binding and bound occurences
 * of those identifiers.
 *
 * The end of this file has code to run the plugin standalone and shows how
 * to invoke the plugin.
 */
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as fastFreshId from '../fastFreshId';

interface State {
  opts: {
    reserved: string[]
  }
}

const visitor: Visitor = {
  Scope({ scope }: NodePath<t.Scopable>,
        { opts: { reserved } }: State) {
    const shadows = Object.keys(scope.bindings)
      .filter(x => reserved.includes(x));
    for (const x of shadows) {
      const new_name = fastFreshId.fresh(x)
      scope.rename(x, new_name.name);
    }
  }
}

export default function() {
  return { visitor: visitor };
}

// Runs this plugin standalone.
function main() {
  const filename = process.argv[2];
  const reserved = process.argv.slice(3);
  const opts = {
    plugins: [
      [() => ({ visitor }), { reserved }]
    ],
    babelrc: false
  };
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
