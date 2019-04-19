/**
 * Command-line to compile continuations.
 */
import * as babel from '@babel/core';
import * as cli from './parse-compiler-opts';
import * as fs from 'fs';
import {  Visitor } from '@babel/traverse';
import * as callcc from '../callcc/callcc';
import * as  flatness from './flatness';
import { traverse, fastFreshId } from '@stopify/normalize-js';
import * as parser from '@babel/parser';
import * as gen from '@babel/generator';
import 'source-map-support/register';

const visitor: Visitor = {
  Program(path) {
    fastFreshId.init(path);
    traverse(path, flatness.visitor);
    traverse(path, callcc.visitor, { opts: cli.compilerOpts });
    path.stop();
  }
};

const ast = parser.parse(fs.readFileSync(cli.srcPath, { encoding: 'utf-8' }));
babel.traverse(ast, visitor);
let code = gen.default(ast).code!;
fs.writeFileSync(cli.dstPath, code);