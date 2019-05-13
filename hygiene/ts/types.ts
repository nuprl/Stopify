import * as t from 'babel-types';

export type State = {
    opts: {
        reserved: string[],
        global: t.Expression | undefined
    }
};