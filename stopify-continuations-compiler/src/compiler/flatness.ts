import { Visitor } from '@babel/traverse';
import * as markFlatFunctions from './markFlatFunctions';
import * as markAnnotated from './markAnnotated';
import * as markFlatApplications from './markFlatApplications';
import { traverse } from '@stopify/normalize-js';

export const visitor: Visitor = {
  Program(path) {
    traverse(path, markAnnotated.visitor as any);
    traverse(path, markFlatFunctions.visitor as any);
    traverse(path, markFlatApplications.visitor);
  }
};
