import * as babel from 'babel-core';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as types from './types';
import * as callcc from './callcc/callcc';
import * as hygiene from '@stopify/hygiene';
import * as h from '@stopify/util';

const visitor: babel.Visitor = {
    Program(path, state) {
        const opts: types.CompilerOpts = {
            getters: false,
            debug: false,
            captureMethod: 'lazy',
            newMethod: 'direct',
            es: 'sane',
            hofs: 'builtin',
            jsArgs: 'simple',
            requireRuntime: false,
            sourceMap: { getLine: () => null },
            onDone: t.functionExpression(t.identifier('done'), [t.identifier('x')], t.blockStatement([t.returnStatement(t.identifier('x'))])),
            eval2: false,
            compileMode:  'normal'
        };

        h.transformFromAst(path,
            [ [ hygiene.plugin, state.opts ] ]);
        h.transformFromAst(path,
            [ [ callcc.default, opts ] ]);
        path.stop();
    }
}

/**
 * Compiles a program to support callCC.
 *
 * @param src the program to compile, which may use callCC
 * @returns an ordinary JavaScript program
 */
export function compileFromAst(src: babel.types.Program, global: t.Expression | undefined): string {


    const babelOpts = {
        plugins: [ [ () => ({ visitor }), { reserved: [], global: global } ] ],
        babelrc: false,
        ast: false,
        code: true,
        minified: false,
        comments: false,
    };

    const { code } = babel.transformFromAst(src, undefined, babelOpts);
    return code!;
}


/**
 * Compiles a program to support callCC.
 *
 * @param src the program to compile, which may use callCC
 * @returns an ordinary JavaScript program
 */
export function compile(src: string, global: t.Expression | undefined): string {
    return compileFromAst(babylon.parse(src).program, global);
}
