/**
 * A very simple visitor that adds support for higher-order functions by
 * passing literal values to wrapper functions in the runtime system. The
 * wrappers rely on sub-classing builtin types (a relatively recent feature
 * of JavaScript). We do not bother changes references to constructors such
 * as Array or String. For now, it is up to the user of Stopify to configure
 * the global environment correctly.
 */
import { Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as util from '@stopify/util';

const visitor: Visitor = {
    ArrayExpression: {
        exit(path) {
            path.skip();
            path.replaceWith(t.callExpression(
                t.identifier('$stopifyArray'),
                [path.node]));
        }
    }
};

export function plugin() {
  return { visitor };
}

export function polyfillHofFromAst(
    src: t.Program): t.Program {
    const babelOpts = {
        plugins: [[ plugin, { } ]],
        babelrc: false,
        ast: true,
        code: false,
        comments: false,
    };
    const { ast } = babel.transformFromAst(src, undefined, babelOpts);
    return ast! as t.Program;
}


