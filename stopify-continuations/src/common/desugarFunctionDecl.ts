import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';

const functionDecl: Visitor = {
  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>) {
    const { id, params, body, async } = path.node;
    path.replaceWith(letExpression(id,
      // Force generator annotations to normal functions - we don't support them
      // Preserve `async` annotations.
      t.functionExpression(undefined, params, body, false, async), 'var'));
  }
};

module.exports = function() {
  return { visitor: functionDecl };
};
