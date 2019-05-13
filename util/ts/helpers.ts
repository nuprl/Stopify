import * as babel from 'babel-core';
import * as t from 'babel-types';
import { NodePath } from 'babel-traverse';
export { letExpression } from './babelHelpers';

export type FunctionNode =
  t.FunctionDeclaration | t.FunctionExpression | t.ObjectMethod;

// Helper to generate tagging function for AST tags preserved between traversals.
export function tag<T, V>(tag: string, t: T, v: V) {
  type S<T> = T & {
    [tag: string]: V
  };
  const tagged = <S<T>>t;
  tagged[tag] = v;
  return tagged;
}


export type Break<T> = T & {
  break_label?: t.Identifier;
};
export type While<T> = T & {
  continue_label?: t.Identifier;
};

export type NewTag<T> = T & {
  new: boolean
};

export const breakLbl = <T>(t: T, v: t.Identifier) => tag('break_label', t, v);
export const continueLbl = <T>(t: T, v: t.Identifier) => tag('continue_label', t, v);
export const newTag = <T>(t: T) => tag('new', t, true);

const containsCallVisitor = {
  FunctionExpression(path: NodePath<t.FunctionExpression>): void {
    path.skip();
  },

  CallExpression(path: NodePath<t.CallExpression>) {
    (this as any).containsCall = true;
    path.stop();
  },

  NewExpression(path: NodePath<t.NewExpression>): void {
    (this as any).containsCall = true;
    path.stop();
  },
};

/**
 * Traverses children of `path` and returns true if it contains any applications.
 */
export function containsCall<T>(path: NodePath<T>) {
  let o = { containsCall: false };
  path.traverse(containsCallVisitor, o);
  return o.containsCall;
}

/**
 * Use this when the contents of the body need to be flattened.
 * @param body An array of statements
 * @returns a new block (does not update the argument)
 */
export function flatBodyStatement(body: t.Statement[]): t.BlockStatement {
  const newBody : t.Statement[] = [];
  body.forEach((elem) => {
    if (t.isBlockStatement(elem)) {
      elem.body.forEach((e) => {
        if (t.isStatement(e)) { newBody.push(e); }
        else if (t.isEmptyStatement(e)) { } else {
          throw new Error(
            'Could not flatten body, element was not a statement');
        }
      });
    } else { newBody.push(elem); }
  });

  return t.blockStatement(newBody);
}

/**
 * A simple wrapper around Babel's `transformFromAst` function.
 */
export function transformFromAst(
  path: NodePath<t.Node>,
  plugins: any[],
  ast = false,
  code = false): babel.BabelFileResult {
  const opts: babel.TransformOptions = {
    plugins: plugins,
    babelrc: false,
    code: false,
    ast: false,
  };
  return babel.transformFromAst(path.node, undefined, opts);
}


