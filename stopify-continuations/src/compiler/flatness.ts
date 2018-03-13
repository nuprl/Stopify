import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import { markFlatFunctions } from './markFlatFunctions';
import { markAnnotated } from './markAnnotated';
import { markFlatApplications } from './markFlatApplications';
import { transformFromAst } from '../common/helpers';
import { CompilerOpts } from '../types';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state: { opts: CompilerOpts }) {
      transformFromAst(path, [ markAnnotated ]);
      transformFromAst(path, [ [markFlatFunctions] ]);
      transformFromAst(path, [ [markFlatApplications, state.opts] ]);
  }
};

export function flatness() {
  return {
    visitor: visitor
  };
}
