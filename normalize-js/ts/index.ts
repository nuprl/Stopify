import * as babel from 'babel-core';
import * as callcc from './callcc';
import * as freeIds from './freeIds';
import * as generic from './generic';
import * as babylon from 'babylon';
export { default as plugin } from './callcc';
export { freeIds, generic };
export { unreachable } from './generic';
import * as hygiene from '@stopify/hygiene';
import * as h from '@stopify/util';
import { Visitor } from 'babel-traverse';

const visitor : Visitor = {
    Program(path) {
        h.transformFromAst(path,
            [ [ hygiene.plugin,  { reserved: [] } ] ]);
        h.transformFromAst(path, [ callcc.default ]);
        path.stop();
    }
}

export function normalize(code: string) {
    let ast = babylon.parse(code);
    const result = babel.transformFromAst(ast.program, undefined, {
        babelrc: false,
        code: true,
        ast: false,
        plugins: [ () => ({ visitor }) ]
    });
    return result.code!;
}