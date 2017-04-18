/**
 * Module to desugar loops into recursive functions. This requires
 * the following transformations to be done:
 *
 * This plugin must enforce the following assumption about loops:
 *
 * Loop bodies are BlockStatements:
 * Loops can have an ExpressionStatement for their body. This messes
 * up the anf pass since it tries to added the complex named expression
 * to the nearest statement. In this case, the statement will be
 * outside the body of the for loop, effectively hoisting them outside
 * the function body. To fix this, the body of all loops should a statement.
 */

import * as t from 'babel-types';
const h = require('./helpers.js');

// Object containing the visitor functions
const loopVisitor = { 
    // Convert For Statements into While Statements
    ForStatement: function ForStatement(path) {
        const node = path.node;
        let { init, test, update, body: wBody } = node;

        // New body is a the old body with the update appended to the end.
        if (update === null) {
            update = t.emptyStatement();
        } else {
            update = t.expressionStatement(update);
        }
        const loopContinue = path.scope.generateUidIdentifier('loop_continue');
        wBody = t.blockStatement([
            t.labeledStatement(loopContinue, wBody),
            update,
        ]);

        // Test can be null
        if (test === null) {
            test = t.booleanLiteral(true);
        }

        const wl = t.whileStatement(test, wBody);
        wl.continue_label = loopContinue;

        // The init can either be a variable declaration or an expression
        let nInit = t.emptyStatement();
        if (init !== null) {
            nInit = t.isExpression(init) ? t.expressionStatement(init) : init;
        }

        path.replaceWith(h.flatBodyStatement([nInit, wl]));
    },

    // Convert do-while statements into while statements.
    DoWhileStatement: function DoWhileStatement(path) {
        const node = path.node;
        let { test, body } = node;

        // Add flag to run the while loop at least once
        const runOnce = path.scope.generateUidIdentifier('runOnce');
        const runOnceInit = t.variableDeclaration('let',
            [t.variableDeclarator(runOnce, t.booleanLiteral(true))]);
        const runOnceSetFalse =
            t.expressionStatement(
                t.assignmentExpression('=', runOnce, t.booleanLiteral(false)));
        body = h.flatBodyStatement([runOnceSetFalse, body]);

        test = t.logicalExpression('||', runOnce, test);

        path.replaceWith(
            h.flatBodyStatement([runOnceInit, t.whileStatement(test, body)]));
    },

    WhileStatement: function (path) {
        // Wrap the body in a labeled continue block.
        if (path.node.continue_label === undefined) {
            const loopContinue = path.scope.generateUidIdentifier('loop_continue');
            path.node.continue_label = loopContinue;
            path.node.body = t.labeledStatement(loopContinue, path.node.body);
        }

        // Wrap the loop in labeled break block.
        if (path.node.break_label === undefined) {
            const loopBreak = path.scope.generateUidIdentifier('loop_break');
            path.node.break_label = loopBreak;
            const labeledStatement = t.labeledStatement(loopBreak, path.node);
            path.replaceWith(labeledStatement);
        }
    }
}

module.exports = function (babel) {
    return { visitor: loopVisitor };
};
