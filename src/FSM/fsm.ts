import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

import { letExpression } from '../common/helpers';

const fsm : Visitor = {
  FunctionExpression: function(path: NodePath<t.FunctionExpression>): void {
    const step = path.scope.generateUidIdentifier('step');
    (<any>path.get('body')).unshiftContainer('body',
      letExpression(step, t.numericLiteral(0)));
  }
};

module.exports = function () {
  return { visitor: fsm };
}
