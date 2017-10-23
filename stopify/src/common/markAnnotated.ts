import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { StopifyAnnotation, isStopifyAnnotation, FlatnessMark } from './helpers';

function markerVisitor(path: NodePath<FlatnessMark<t.CallExpression|t.NewExpression|t.FunctionDeclaration|t.FunctionExpression>>) {
    const { leadingComments } = path.node
    if (leadingComments && leadingComments.length > 0 &&
        isStopifyAnnotation(leadingComments[leadingComments.length - 1].value.trim())) {
      path.node.mark = 'Flat';
    }
}

const visitor: Visitor = {
  CallExpression: markerVisitor,
  NewExpression: markerVisitor,
  FunctionDeclaration: markerVisitor,
  FunctionExpression: markerVisitor
}

export default function () {
    return { visitor };
}
