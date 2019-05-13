import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import { markFlatFunctions } from './markFlatFunctions';
import { markAnnotated } from './markAnnotated';
import { markFlatApplications } from './markFlatApplications';
import { transformFromAst } from '@stopify/util';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
      transformFromAst(path, [ markAnnotated ]);
      transformFromAst(path, [ [markFlatFunctions] ]);
      transformFromAst(path, [ markFlatApplications ]);
  }
};

export function flatness() {
  return {
    visitor: visitor
  };
}
