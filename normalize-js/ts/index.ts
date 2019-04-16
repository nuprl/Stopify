import * as fastFreshId from './fastFreshId';
import * as babel from 'babel-core';
import * as callcc from './callcc';
import * as freeIds from './freeIds';
import * as generic from './generic';
import * as babelHelpers from './babelHelpers';

export { default as plugin } from './callcc';
export { default as hygiene } from './hygiene';
export { fastFreshId, freeIds, generic, babelHelpers };
export { unreachable } from './generic';
export { transformFromAst } from './helpers';

export function normalize(code: string) {
    const result = babel.transform(code, {
        babelrc: false,
        code: true,
        ast: false,
        plugins: [callcc.default]
    });
    return result.code!;
}