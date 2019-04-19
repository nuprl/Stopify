import * as babel from '@babel/core';
import * as t from '@babel/types';
import { Visitor, NodePath } from '@babel/traverse';
export { letExpression } from './babelHelpers';
import * as gen from '@babel/generator';

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

export function traverse<S = {}>(path: NodePath<t.Node>,
  visitor: Visitor<S>,
  state?: S) {
  if (state === undefined) {
    babel.traverse(path.parent, visitor as any, path.scope, {});
  }
  else {
    babel.traverse(path.parent, visitor, path.scope, state);
  }
}



