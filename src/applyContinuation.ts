// Post-CPS transformation to apply top-level continuation and eval program.

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as b from 'babylon';
import * as t from 'babel-types';

const consoleLog =
    t.expressionStatement(t.callExpression(t.identifier('console.log'),
        [t.stringLiteral('continuation leaf')]));

const program : VisitNode<t.Program> = function (path: NodePath<t.Program>): void {
    const { body } = path.node;

    const k = path.scope.generateUidIdentifier('k');
    const cpsFunction = (<t.ExpressionStatement>body[0]).expression;
    const kArgs = <any>[k];
    const kont = t.functionExpression(null, kArgs, t.blockStatement([consoleLog]));
    const cpsApply = t.callExpression(cpsFunction, [kont]);

    path.node.body = [t.expressionStatement(cpsApply)];
};

const kApplyVisitor : Visitor = {
    Program: program
};

module.exports = function (babel) {
    return { visitor: kApplyVisitor };
};
