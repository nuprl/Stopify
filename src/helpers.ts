import * as babel from 'babel-core';
import * as t from 'babel-types';

// Wrap AST nodes with `cps` property
export type CPS<T> = T & {
  cps?: boolean;
};
function cps<T>(t: T): CPS<T> {
    const cpsd = <CPS<T>>t;
    cpsd.cps = true;
    return cpsd;
}

// Object to wrap the state of the stop, onStop, isStop functions
class StopWrapper {
  private hasStopped: boolean;
  onDone: (any?) => any
  constructor(onDone: (any?) => any = (value) => console.log(value)) {
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


function isAtomic(node: t.Node): boolean {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function isTerminating(node: t.Node): boolean {
  return !t.isCallExpression(node);
}

function letExpression(name: t.Identifier, value: t.Expression): t.VariableDeclaration {
  return t.variableDeclaration('const',
    [t.variableDeclarator(name, value)]);
}

function flatten(seq: t.Statement[]): t.Statement[] {
  return seq.reduce((prog, statements) => prog.concat(statements), []);
}

/**
 * Use this when the contents of the body need to be flattened.
 * @param body An array of statements
 */
function flatBodyStatement(body: t.Statement[]): t.BlockStatement {
  const newBody = [];
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

function isNativeFunction(node: t.Node): boolean {
  const natives = [
    'console',
    'Math',
    'String',
    'JSON',
    'window'
  ]
  return t.isMemberExpression(node) &&
    t.isIdentifier(node.object) && natives.includes(node.object.name);
}

function transform(src: string, plugs: any[][]): string {
  let { code, ast } = babel.transform(src, { babelrc: false });
  plugs.forEach(trs => {
    const res = babel.transformFromAst(ast, code, {
      plugins: [...trs],
      babelrc: false,
    });
    code = res.code;
    ast = res.ast;
  });

  return code;
}

export {
  isAtomic,
  isTerminating,
  letExpression,
  flatten,
  flatBodyStatement,
  isNativeFunction,
  transform,
  StopWrapper,
  cps,
};

