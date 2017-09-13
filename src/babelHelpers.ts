import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';

export type FunWithBody = t.FunctionDeclaration | t.FunctionExpression |
  t.ObjectMethod;

export const eTrue = t.booleanLiteral(true);

export const eFalse = t.booleanLiteral(false);

export const eUndefined = t.identifier('undefined');

/** Constructs an 'e1 && e2', but simplifies when either sub-expression is
 *  a literal.
 */
export function and(e1: t.Expression, e2: t.Expression) {
  if ((e1.type === 'BooleanLiteral' && e1.value === true)) {
    return e2;
  }
  else if (e2.type === 'BooleanLiteral' && e2.value === true) {
    return e1;
  }
  else if ((e1.type === 'BooleanLiteral' && e1.value === false) ||
           (e2.type === 'BooleanLiteral' && e2.value === false)) {
    return eFalse;
  }
  else {
    return t.logicalExpression('&&', e1, e2);
  }
}

/** Constructs an 'e1 || e2', but simplifies when either sub-expression is
 *  a literal.
 */
export function or(e1: t.Expression, e2: t.Expression) {
  if ((e1.type === 'BooleanLiteral' && e1.value === false)) {
    return e2;
  }
  else if (e2.type === 'BooleanLiteral' && e2.value === false) {
    return e1;
  }
  else if ((e1.type === 'BooleanLiteral' && e1.value === true) ||
           (e2.type === 'BooleanLiteral' && e2.value === true)) {
    return eTrue;
  }
  else {
    return t.logicalExpression('||', e1, e2);
  }
}

export function sIf(e: t.Expression, s1: t.Statement, s2?: t.Statement) : t.Statement {
  if (s2 === undefined) {
    s2 = t.emptyStatement();
  }
  if (e.type === 'BooleanLiteral' && e.value === true) {
    return s1;
  }
  else if (e.type === 'BooleanLiteral' && e.value === false) {
    return s2;
  }
  else {
    if (t.isEmptyStatement(s2)) {
      return t.ifStatement(e, s1);
    }
    else {
      return t.ifStatement(e, s1, s2);
    }
  }
}

/**
 * Replaces a statement with a sequence of statements, creating a BlockStatement
 * if necessary.
 *
 * NOTE(arjun): There appears to be a bug with Babel's path.replaceWithMultiple
 * that this function works around. To witness the bug, try the ClojureScript
 * benchmarks using Babel's replaceWithMultiple instead of this function.
 *
 * @param path the path to a statement to replace
 * @param stmts a sequence of statements
 */
export function replaceWithStatements(
  path: NodePath<t.Statement>,
  ...stmts: t.Statement[]) {
  if (path.parent.type === 'BlockStatement') {
    path.replaceWithMultiple(stmts);
  }
  else {
    path.replaceWith(t.blockStatement(stmts));
  }
}
