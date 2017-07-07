/**
 * Desugars switch statements to if statements.
 *
 * switch(e1) {
 *   case c1:
 *     s1 ...
 *   case c2:
 *     s2 ...
 *   default:
 *     s3 ...
 * }
 *
 * is transformed into:
 *
 * {
 *   let fallthrough = false;
 *   let test = e1;
 *   if (test === c1 || fallthroug) {
 *      s1 ...
 *      fallthrough = true;
 *   }
 *   if (test === c1 || fallthrough) {
 *      s1 ...
 *      fallthrough = true;
 *   }
 *   if (test === c1 || fallthrough) {
 *    s2 ...
 *    fallthrough = true;
 *   }
 *   s3 ...
 * } 

 */
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';

function ifTest(e: t.Expression,
  discriminant: t.Identifier,
  fallthrough: t.Identifier): t.LogicalExpression {
    return t.logicalExpression('||', t.binaryExpression('===', discriminant, e),
      fallthrough);
  }

function desugarCases(cases: t.SwitchCase[],
  discriminant: t.Identifier,
  fallthrough: t.Identifier): t.Statement[] {
    if (cases.length === 0) {
      return [];
    }

    const [hd, ...tail] = cases;
    const { test, consequent } = hd;

    if (test === null) {
      return consequent;
    } else {
      const cond = ifTest(test, discriminant, fallthrough);
      const newTail = desugarCases(tail, discriminant, fallthrough);
      newTail.unshift(t.ifStatement(cond,
        t.blockStatement([
          t.expressionStatement(t.assignmentExpression('=', fallthrough,
            t.booleanLiteral(true))),
          ...consequent
        ])));
      return newTail;
    }
  }

const switchVisitor: Visitor = {
  SwitchStatement: function (path: NodePath<t.SwitchStatement>): void {
    const { discriminant, cases } = path.node;
    const test = path.scope.generateUidIdentifier('test');
    const fallthrough = path.scope.generateUidIdentifier('fallthrough');
    let desugared : t.Statement[] = [];
    desugared.unshift(...desugarCases(cases, test, fallthrough));
    desugared.unshift(letExpression(fallthrough, t.booleanLiteral(false)));
    desugared.unshift(letExpression(test, discriminant));
    path.replaceWith(t.blockStatement(desugared));
  }
};


module.exports = function() {
  return { visitor: switchVisitor };
};
