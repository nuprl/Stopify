import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';


function containsCall<T>(path: NodePath<T>) {
    let containsCall = false;
    const containsCallVisitor = {
        CallExpression(path: NodePath<t.LogicalExpression>) {
          containsCall = true;
          path.stop();
        }
    };
    path.traverse(containsCallVisitor);
    return containsCall;
}

export const visitor: Visitor = {

    WhileStatement(path: NodePath<t.WhileStatement>) {
        if (!containsCall(path)) {
            return;
        }
        const test = path.node.test;
        path.node.test = t.booleanLiteral(true);
        path.node.body = t.blockStatement(
            [t.ifStatement(test, path.node.body, t.breakStatement())]);

    },

    LogicalExpression(path: NodePath<t.LogicalExpression>) {
        if (!containsCall(path)) {
            return;
        }

        const op = path.node.operator;
        const stmt = path.getStatementParent();
        const r = stmt.scope.generateUidIdentifier(op === "&&" ? "and" : "or");
        const lhs = stmt.scope.generateUidIdentifier("lhs");


        stmt.insertBefore(letExpression(lhs, path.node.left));
        stmt.insertBefore(
            t.variableDeclaration("let", [t.variableDeclarator(r)]));

        const x = t.blockStatement([t.expressionStatement(
            t.assignmentExpression("=", r, path.node.right))]);
        const y = t.blockStatement([t.expressionStatement(
            t.assignmentExpression("=", r, lhs))]);

        if (op === "&&") {
            stmt.insertBefore(t.ifStatement(lhs, x, y));
        }
        else {
            stmt.insertBefore(t.ifStatement(lhs, y, x));
        }
        path.replaceWith(r);
    },

    ConditionalExpression(path: NodePath<t.ConditionalExpression>) {
        if (!containsCall(path)) {
            return;
        }

        const r = path.scope.generateUidIdentifier("cond");
        const test = path.scope.generateUidIdentifier("test");

        const stmt = path.getStatementParent();
        stmt.insertBefore(
            t.variableDeclaration("let", [t.variableDeclarator(r)]));
        stmt.insertBefore(
            t.variableDeclaration(
                "const",
                [t.variableDeclarator(test, path.node.test)]));
        stmt.insertBefore(
            t.ifStatement(
                test,
                t.blockStatement([
                    t.expressionStatement(
                        t.assignmentExpression("=", r, path.node.consequent))]),
                t.blockStatement([
                    t.expressionStatement(
                        t.assignmentExpression("=", r, path.node.alternate))])
            ));
        path.replaceWith(r);
    }

}
