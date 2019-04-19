import * as fastFreshId from './fastFreshId';
import * as babel from '@babel/core';
import * as callcc from './callcc';
import * as freeIds from './freeIds';
import * as generic from './generic';
import * as babelHelpers from './babelHelpers';

export { traverse } from './helpers';
export { visitor, visitorBody } from './callcc';
export { visitor as hygiene } from './hygiene';
export { fastFreshId, freeIds, generic, babelHelpers };
export { unreachable } from './generic';
import * as parser from '@babel/parser';
import * as gen from '@babel/generator';

export function normalize(code: string) {
    const file = parser.parse(code);
    let p = file.program;
    let state = { opts: { nameReturns: false } };
    babel.traverse(file, callcc.visitor, undefined as any, state);
    const result =  gen.default(file).code;
    return result;
}

