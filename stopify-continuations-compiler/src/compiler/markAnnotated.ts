import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import { isStopifyAnnotation, FlatnessMark } from '../helpers';

function markerVisitor(path: NodePath<FlatnessMark<t.CallExpression|t.NewExpression|t.FunctionDeclaration|t.FunctionExpression>>) {
    const { leadingComments } = path.node;
    if (leadingComments && leadingComments.length > 0 &&
        isStopifyAnnotation(
          leadingComments[leadingComments.length - 1].value.trim())) {
      path.node.mark = 'Flat';
    }
}

const visitor = {
  CallExpression: markerVisitor,
  NewExpression: markerVisitor,
  FunctionDeclaration: markerVisitor,
  FunctionExpression: markerVisitor
};

export function markAnnotated() {
    return { visitor };
}
