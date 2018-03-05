import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';

export type FunWithBody = t.FunctionDeclaration | t.FunctionExpression |
  t.ObjectMethod;

export const eTrue = t.booleanLiteral(true);

export const eFalse = t.booleanLiteral(false);

export const eUndefined = t.identifier('undefined');

export function enclosingScopeBlock(path: NodePath<t.Node>): t.Statement[] {
  const parent = path.getFunctionParent().node;
  if (t.isProgram(parent)) {
    return parent.body;
  }
  else if (t.isFunctionExpression(parent) ||
           t.isFunctionDeclaration(parent) ||
           t.isObjectMethod(parent)) {
    return parent.body.body;
  }
  else {
    throw new Error(`parent is a ${parent.type}`);
  }
}

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

/**
 * Given an 'LVal' that is an identifier, produces the identifier's name.
 * Throws an exception if the 'LVal' is not an identifier.
 *
 * @param lval an l-value
 * @returns the name of the identifier, if 'lval' is an identifier
 */
export function lvaltoName(lval: t.LVal): string {
  if (lval.type === 'Identifier') {
    return lval.name;
  }
  else if (lval.type === 'RestElement' && lval.argument.type === 'Identifier') {
    return lval.argument.name;
  }
  else {
    throw new Error(`Expected Identifier, received ${lval.type}`);
  }
}

function isPropertyValue(p: t.ObjectProperty | t.ObjectMethod): boolean {
  return (
    t.isObjectMethod(p) ||
    (p.computed === false && isValue(p.value)));
}

/**
 * Produces 'true' if 'e' is a value.
 *
 * @param e
 */
export function isValue(e: t.Expression): boolean {
  return (
    t.isLiteral(e) ||
    t.isFunction(e) ||
    (t.isArrayExpression(e) && e.elements.every(isValue)) ||
    (t.isObjectExpression(e) && e.properties.every(isPropertyValue)) ||
    t.isIdentifier(e));
}

export function arrayPrototypeSliceCall(e: t.Expression): t.Expression {
  return t.callExpression(
    t.memberExpression(
      t.memberExpression(
          t.memberExpression(t.identifier('Array'), t.identifier('prototype')),
          t.identifier('slice')),
      t.identifier('call')),
    [e]);
}

export function varDecl(x: string | t.Identifier,
  init?: t.Expression): t.VariableDeclaration {
  const id = typeof x === 'string' ? t.identifier(x) : x;
  return t.variableDeclaration('var', [t.variableDeclarator(id, init)]);
}
