import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import {letExpression} from './helpers';

const functionDecl: Visitor = {
  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>) {
    const { id, params, body } = path.node;
    path.replaceWith(letExpression(id!,
      t.functionExpression(undefined, params, body), 'var'));
  }
};

export default function() {
  return { visitor: functionDecl };
};
