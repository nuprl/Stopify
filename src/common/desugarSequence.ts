import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as g from 'babel-generator';

const seqs: Visitor = {
  SequenceExpression: function (path: NodePath<t.SequenceExpression>): void {
    if (t.isExpressionStatement(path.parent)) {
      console.log('foo');
      path.getStatementParent().replaceWithMultiple([
        ...(path.node.expressions.map(x => t.expressionStatement(x))),
      ]);
    }
  }
};

module.exports = function () {
  return { visitor: seqs };
};
