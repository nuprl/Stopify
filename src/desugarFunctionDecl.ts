import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from './helpers';

const functionDecl: Visitor = {
  FunctionDeclaration: {
    exit(path: NodePath<t.FunctionDeclaration>) {
      const { id, params, body } = path.node;
      path.replaceWith(letExpression(id, t.functionExpression(id, params, body)));
    }
  }
};

module.exports = function() {
  return { visitor: functionDecl };
};
