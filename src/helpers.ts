import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as b from './steppifyInterface';

export type FunctionNode = t.FunctionDeclaration | t.FunctionExpression;

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

export type OptimizeMark<T> = T & {
  OptimizeMark: Tag
}

export type While<T> = T & {
  continue_label?: t.Identifier;
}
export type Break<T> = T & {
  break_label?: t.Identifier;
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
const breakLbl = <T>(t: T, v: t.Identifier) => tag('break_label', t, v);
const continueLbl = <T>(t: T, v: t.Identifier) => tag('continue_label', t, v);
const administrative = <T>(t: T) => tag('isAdmin', t, true);
const call = <T>(t: T) => tag('isCall', t, true);
const apply = <T>(t: T) => tag('isApply', t, true);
const directApply = <T>(t: T) => tag('isDirect', t, true);
const transformed = <T>(t: T) => tag('isTransformed', t, true);

export interface ReturnStatement extends t.ReturnStatement {
  kArg: t.Expression;
};

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

function transform(src: string, plugs: any[][]): string {
  let { code, ast } = babel.transform(src, { babelrc: false, sourceMaps: 'inline' });
  plugs.forEach(trs => {
    const res = babel.transformFromAst(<t.Node>ast, code, {
      plugins: [...trs],
      babelrc: false,
      sourceMaps: 'inline',
    });
    code = res.code;
    ast = res.ast;
  });

  return code === undefined ? "" : code;
}

function parseMapping(code: string) {
  const reg = /\/\* mapping:.*\*\//;
  const line = reg.exec(code);
  // No match
  if (line === null) {
    console.log('// No mapping found, using one-to-one map')
    return null;
  } else {
    const str = line[0];
    let map = str.substring(str.indexOf('['), str.lastIndexOf(']') + 1);
    if (map.charAt(0) !== '[') {
      throw new Error(`Malformed mapping string: ${str}`);
    }
    return new b.MapLineMapping(new Map<number, number>(eval(map)));
  }
}

function transformWithLines(src: string, plugs: any[][], breakPoints: number[]): string {
  let { code, ast } = babel.transform(src, { babelrc: false, sourceMaps: 'inline' });

  let map = parseMapping(src);
  if (map === null) {
    map = new b.FunctionLineMapping(x => x)
  }
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

export {
  administrative,
  call,
  apply,
  directApply,
  transformed,
  breakLbl,
  continueLbl,
  letExpression,
  flatBodyStatement,
  transform,
  transformWithLines,
  StopWrapper,
};

