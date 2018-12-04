/**
 * This transformation dynamically invokes stopify on `eval`'d strings.
 *
 * Preconditions:
 * 1. The freeIds pass has been applied.
 */
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as fastFreshId from '../fastFreshId';
import { NodePath, Visitor } from 'babel-traverse';
import { CompilerOpts } from '../types';

function reify(opts: CompilerOpts): t.ObjectExpression {
  const props = [];
  for (const p in opts) {
    switch (p) {
      case 'compileFunction':
        props.push(t.objectProperty(t.stringLiteral(p),
          t.booleanLiteral(true)));
        break;
      case 'getters':
      case 'debug':
      case 'eval':
      case 'requireRuntime':
        props.push(t.objectProperty(t.stringLiteral(p),
          t.booleanLiteral((opts as any)[p])));
        break;
      case 'captureMethod':
      case 'newMethod':
      case 'es':
      case 'hofs':
      case 'jsArgs':
        props.push(t.objectProperty(t.stringLiteral(p),
          t.stringLiteral((opts as any)[p])));
        break;
      case 'sourceMap':
        break;
      case 'onDone':
        break;
      default:
        throw new Error(`Unexpected compiler option '${p}'`);
    }
  }
  return t.objectExpression(props);
}

const visitor: Visitor = {
  Program() {
    this.renames = [];
    this.boxed = [];
  },

  Scope: {
    enter(path: NodePath<t.Scopable>): void {
      this.renames.push((<any>path.node).renames);
      this.boxed.push((<any>path.node).boxed);
    },
    exit(path: NodePath<t.Scopable>): void {
      this.renames.pop();
      this.boxed.pop();
    },
  },

  CallExpression: function (path: NodePath<t.CallExpression>, state: { opts: CompilerOpts }): void {
    if (t.isIdentifier(path.node.callee) &&
      path.node.callee.name === 'eval') {

      // Construct rename object.
      const renames: { [key: string]: string } = {};
      this.renames.forEach((map: { [key: string]: string }) => {
        for (const x in map) {
          renames[x] = map[x];
        }
      });
      let props = [];
      for (const x in renames) {
        props.push(
          t.objectProperty(t.stringLiteral(x), t.stringLiteral(renames[x])));
      }

      // Construct boxed array.
      const vars = new Set();
      this.boxed.filter((x: any) => !!x).forEach((set: Set<string>) =>
        set.forEach(x => vars.add(x)));

      const evalBlock =
        t.blockStatement([t.returnStatement(t.callExpression(t.identifier('eval'),
          [t.callExpression(
            t.memberExpression(t.identifier("$__C"), t.identifier("compileEval")),
            [
              ...path.node.arguments,
              reify(state.opts),
              t.objectExpression(props),
              t.arrayExpression(Array.from(vars).map(x => t.stringLiteral(x)))
            ]
          )]))]);

      path.node.callee = t.functionExpression(
        fastFreshId.fresh('funExpr'), [], evalBlock);

      path.node.arguments = [];
      path.skip();
    }
  }
};

export function plugin() {
  return { visitor };
}

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
