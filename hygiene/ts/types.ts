import * as t from 'babel-types';
import * as h from '@stopify/util';

export type State = {
    opts: {
        reserved: string[],
        global: t.Expression | undefined
    }
};