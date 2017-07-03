import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as b from '../interfaces/steppifyInterface';
import { SourceMapConsumer } from 'source-map';
import * as smc from 'convert-source-map';

export type FunctionNode = t.FunctionDeclaration | t.FunctionExpression | t.ObjectMethod;

// Helper to generate tagging function for AST tags preserved between traversals.
function tag<T, V>(tag: string, t: T, v: V) {
  type S<T> = T & {
    [tag: string]: V
  }
  const tagged = <S<T>>t;
  tagged[tag] = v;
  return tagged;
}

// Used for marking known transformed functions
export type Tag = 'Transformed' | 'Untransformed' | 'Unknown'

export type Hoisted<T> = T & {
  hoisted?: boolean
}
export type OptimizeMark<T> = T & {
  OptimizeMark: Tag
}
export type While<T> = T & {
  continue_label?: t.Identifier;
}
export type Break<T> = T & {
  break_label?: t.Identifier;
}
export type LineMappingMark<T> = T & {
  lineMapping?: b.LineMapping
}
// Mark a node as transformed. Used by the transformMarked transform.
export type Transformed<T> = T & {
  isTransformed?: boolean
}
export type Administrative<T> = T & {
  isAdmin?: boolean
}
export type Call<T> = T & {
  isCall?: boolean
}
export type Apply<T> = T & {
  isApply?: boolean
}
export type Direct<T> = T & {
  isDirect?: boolean
}
export type KArg<T> = T & {
  kArg: t.Identifier;
}
export type NewTag<T> = T & {
  new: boolean
}
export type IsEval<T> = T & {
  isEval: boolean
}
const isEval = <T>(t:T) => tag('isEval', t, true)
const hoisted = <T>(t: T) => tag('hoisted', t, true);
const breakLbl = <T>(t: T, v: t.Identifier) => tag('break_label', t, v);
const continueLbl = <T>(t: T, v: t.Identifier) => tag('continue_label', t, v);
const administrative = <T>(t: T) => tag('isAdmin', t, true);
const call = <T>(t: T) => tag('isCall', t, true);
const apply = <T>(t: T) => tag('isApply', t, true);
const directApply = <T>(t: T) => tag('isDirect', t, true);
const transformed = <T>(t: T) => tag('isTransformed', t, true);
const kArg = <T>(t: T, v: t.Identifier) => tag('kArg', t, v);
const newTag = <T>(t: T) => tag('new', t, true);

// Object to wrap the state of the stop, onStop, isStop functions
class StopWrapper {
  private hasStopped: boolean;
  onDone: (arg?: any) => any
  constructor(onDone: (arg?: any) => any = (value) => console.log(value)) {
    this.hasStopped = false;
    this.onDone = onDone;
  }
  onStop() {
    throw 'Execution stopped'
  }
  stop() {
    this.hasStopped = true;
  }
  isStop() {
    return this.hasStopped === true;
  }
}

type kind = 'const' | 'var' | 'let' | undefined;
function letExpression(name: t.LVal,
  value: t.Expression,
  kind: kind = 'let'): t.VariableDeclaration {
    return t.variableDeclaration(kind, [t.variableDeclarator(name, value)]);
  }

/**
 * Use this when the contents of the body need to be flattened.
 * @param body An array of statements
 */
function flatBodyStatement(body: t.Statement[]): t.BlockStatement {
  const newBody : t.Statement[] = [];
  body.forEach((elem) => {
    if (t.isBlockStatement(elem)) {
      elem.body.forEach((e) => {
        if (t.isStatement(e)) newBody.push(e);
        else if (t.isEmptyStatement(e)) { } else {
          throw new Error(
            'Could not flatten body, element was not a statement');
        }
      });
    } else newBody.push(elem);
  });

  return t.blockStatement(newBody);
}

// Returns a tuple of string and a boolean. The string represents the
// transformed program. The boolean is true iff the compiler runtime needs
// to be included.
function transform(src: string, plugs: any[][]): [string, boolean] {
  let { code, ast } = babel.transform(src,
    { babelrc: false, sourceMaps: 'inline' });
  plugs.forEach(trs => {
    const res = babel.transformFromAst(<t.Node>ast, code, {
      plugins: [...trs],
      babelrc: false,
    });
    code = res.code;
    ast = res.ast;
  });

  if (code !== undefined && ast !== undefined) {
    return [code, (<IsEval<t.Program>>(<t.File>ast).program).isEval]
  } else {
    throw new Error('Transform returned an empty string')
  }
}

function parseMapping(code: string) {
  const mapConverter = smc.fromSource(code);
  // No match
  if (mapConverter === null) {
    console.log('// No mapping found, using one-to-one map')
    return new b.LineMapping((line: number, column: number) => line);
  } else {
    console.log('// Mapping found')
    const map = new SourceMapConsumer(mapConverter.toObject())
    return new b.LineMapping((line: number, column: number) => {
      const mapping = map.originalPositionFor({ line, column });
      if (mapping.source === null || mapping.source.includes('node_modules') || mapping.line === null) {
        return null;
      } else {
        return mapping.line
      }
    })
  }
}

function transformWithLines(src: string, plugs: any[][], breakPoints:
  number[]): string {
  let { code, ast } = babel.transform(src,
    { babelrc: false, sourceMaps:
    'inline' });

  let map = parseMapping(src);
  (<any>ast).program.lineMapping = map;

  plugs.forEach(trs => {
    const res = babel.transformFromAst(<t.Node>ast, code, {
      plugins: [...trs],
      babelrc: false,
    });
    code = res.code;
    ast = res.ast;
  });

  return code === undefined ? "" : code;
}

export type FVSet<A> = A[];

function fvSetOfArray<A>(arr: A[]): FVSet<A> {
  return arr;
}

function copyFVSet<A>(fvs: FVSet<A>): FVSet<A> {
  return fvs.map(x => x);
}

function empty<A>(): A[] {
  return [];
}

function singleton<A>(a: A): A[] {
  return [a];
}

function add<A>(a: A, s: A[]): A[] {
  if (s.includes(a)) {
    return s;
  } else {
    s.push(a);
    return s;
  }
}

function union<A>(a: A[], b: A[]): A[] {
  return [...a].reduce((s, x) => add(x, s), b);
}

function diff<A>(a: A[], b: A[]): A[] {
  return [...a].filter(x => !b.includes(x));
}

function intersect<A>(a: A[], b: A[]): A[] {
  return [...a].filter(x => b.includes(x));
}

function size<A>(s: A[]): number {
  return s.length;
}

function remove<A>(a: A, s: A[]): A[] {
  const idx = s.indexOf(a);
  if (idx !== -1) {
    s.splice(idx, 1);
  }
  return s;
}

export {
  hoisted,
  administrative,
  call,
  apply,
  directApply,
  transformed,
  breakLbl,
  continueLbl,
  kArg,
  newTag,
  letExpression,
  flatBodyStatement,
  transform,
  transformWithLines,
  StopWrapper,
  fvSetOfArray,
  copyFVSet,
  empty,
  singleton,
  add,
  union,
  diff,
  intersect,
  size,
  remove,
};

