/*
 * This plugin can help another plugin be hygienic (in the Scheme macro sense)
 * when introducing new names. It requires as an option an array of identifiers
 * that the program should not use and renames all binding and bound occurences
 * of those identifiers.
 */
import { Visitor } from 'babel-traverse';
import * as useGlobalObject from './useGlobalObject';
import * as fastFreshId from './fastFreshId';
import * as hygiene from './hygiene';
import { transformFromAst  } from '@stopify/util';
import { State } from './types';
export { fresh, nameExprBefore, reset, init } from './fastFreshId';

const visitor: Visitor = {
    Program(path, state: State) {
        fastFreshId.init(path);
        transformFromAst(path, [
            [ hygiene.default, state.opts ]
        ]);
        if (state.opts.global !== undefined) {
            transformFromAst(path, [
                [ useGlobalObject.plugin, state.opts ]
            ]);
        }
        path.stop();
    }
}

export function plugin() {
    return { visitor };
}