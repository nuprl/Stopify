import * as babel from 'babel-core';
import * as callcc from './callcc';
import * as freeIds from './freeIds';
import * as generic from './generic';

export { default as plugin } from './callcc';
export { freeIds, generic };
export { unreachable } from './generic';
import * as hygiene from '@stopify/hygiene';

export function normalize(code: string) {
    const result = babel.transform(code, {
        babelrc: false,
        code: true,
        ast: false,
        plugins: [
            [ hygiene.plugin,  { reserved: [] } ],
            callcc.default
        ]
    });
    return result.code!;
}