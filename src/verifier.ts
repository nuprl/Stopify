// Use this file to document all the constraints on JS--.
const t = require('babel-types');

const verifyVisitor = { 
    // Only while loops.
    Loop: function Loop(path) {
        if (t.isWhileStatement(path.node) === false) {
            throw new Error(`Resulting code has ${path.node.type}`);
        }
    },

    // No switch-case constructs.
    ['SwitchStatement|SwitchCase']: function (path) {
        throw new Error(`Resulting code has ${path.node.type}`);
    },

    // No logical expressions.
    LogicalExpression: function (path) {
        throw new Error(`Resulting code has ${path.node.type}`);
    },

    // Programs should consist of a single function expression after CPS.
    Program: function (path) {
        const { body } = path.node;
        if (body.length !== 1 && t.isExpressionStatement(body[0]) &&
            t.isFunctionExpression(body[0].expression)) {
            throw new Error(`Resulting CPS code not a function expression, but
            ${path.node.type}`);
        }
    }
}

export function transform(babel) {
    return { verifyVisitor };
};
