import * as babel from 'babel-core';
import * as t from 'babel-types';

export type FunctionNode = t.FunctionDeclaration | t.FunctionExpression;

// Mark a node as transformed. Used by the transformMarked transform.
export type Transformed<T> = T & {
    isTransformed?: boolean
}
export function transformed<T>(t: T): Transformed<T> {
  const trans = (<Transformed<T>>t);
  trans.isTransformed = true;
  return trans;
}

// Used for marking known transformed functions
export type Tag = 'Transformed' | 'Untransformed' | 'Unknown'

export type OptimizeMark<T> = T & {
  OptimizeMark: Tag
}


// Wrap AST nodes with `cps` property
export type CPS<T> = T & {
  cps?: boolean;
};
function cps<T>(t: T): CPS<T> {
    const cpsd = <CPS<T>>t;
    cpsd.cps = true;
    return cpsd;
}

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

export {
  letExpression,
  flatBodyStatement,
  transform,
  StopWrapper,
  cps,
};

