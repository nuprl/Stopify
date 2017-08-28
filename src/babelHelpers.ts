import * as babel from 'babel-core';
import * as t from 'babel-types';

export const eTrue = t.booleanLiteral(true);

export const eFalse = t.booleanLiteral(false);

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

export function sIf(e: t.Expression, s1: t.Statement) : t.Statement | undefined {
  if (e.type === 'BooleanLiteral' && e.value === true) {
    return s1;
  }
  else if (e.type === 'BooleanLiteral' && e.value === false) {
    return undefined;
  }
  else {
    return t.ifStatement(e, s1);
  }
}