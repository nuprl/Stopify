/**
 * Command-line to compile continuations.
 */
import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as cli from './parse-compiler-opts';
import * as fs from 'fs';
import { NodePath, Visitor } from 'babel-traverse';
import callcc from '../callcc/callcc';
import { flatness } from './flatness';
import { transformFromAst, fastFreshId } from '@stopify/normalize-js';
import 'source-map-support/register';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    fastFreshId.init(path);
    transformFromAst(path, [flatness]);
    transformFromAst(path, [[callcc, cli.compilerOpts]]);
    path.stop();
  }
};

const opts: babel.TransformOptions = {
  plugins: [function() { return { visitor }; }],
  babelrc: false,
  code: true,
  ast: false,
};


const result = babel.transformFileSync(cli.srcPath, opts);
fs.writeFileSync(cli.dstPath, result.code);
