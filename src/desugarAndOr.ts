/**
 * Module to desugar early-escaping && and || operators.
 *
 * Early-escaping logical expressions are transformed into ternary expressions.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

// Object containing the visitor functions
const andOrVisitor : Visitor = { 
    // No Logical Binary Expressions
    LogicalExpression: function (path: NodePath<t.LogicalExpression>): void {
        const node = path.node;
        const { left, operator, right } = node;

        const tmp = path.scope.generateUidIdentifier('t');
        // NOTE(arjun): The result of an assignment is value of the right-hand size.
        const test = t.assignmentExpression('=', tmp, left);
        const trueBranch = operator === '&&' ? right : tmp;
        const falseBranch = operator === '&&' ? tmp : right;

        path.getStatementParent().insertBefore(t.variableDeclaration('let',
            [t.variableDeclarator(tmp)]));
        path.replaceWith(t.ifStatement(test,
            t.expressionStatement(trueBranch),
            t.expressionStatement(falseBranch)));
    }
}

module.exports = function (babel) {
    return { visitor: andOrVisitor };
};
