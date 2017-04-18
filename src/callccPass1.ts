/**
 * BNF transform:
 * JS working BNF:
 *
 * e ::= n
 *     | str
 *     | x
 *     | let x = e
 *     | e `op` e
 *     | function () { e; }
 *     | function x() { e; }
 *     | e; e
 *     | e(e*)
 *     | return e;
 *
 * Resulting A Normal BNF:
 *
 *  a ::= n | str | x
 *
 *  l ::= a | a `op` a | e(a*)
 *
 *  s2 ::= l
 *       | let x = l
 *       | s2; s2
 *       | function () { s2; }
 *       | function x() { s2; }
 *       | return a;
 */

const t = require('babel-types');
const h = require('./helpers.js');

/** The body must be an array of statements and name must be unique in the
 * scope.
 * arg must be a single argument.
 */
function namedFunction(fname, arg, body) {
    return t.functionDeclaration(fname, [arg], t.blockStatement(body));
}

// Object to contain the visitor functions
const callccVisitor = {
    VariableDeclarator: function VariableDeclarator(path) {
        if (t.isCallExpression(path.node.init) === false) {
            return;
        }
        const stmtParent = path.getStatementParent();
        const thisPath = stmtParent.key;
        const sibs = stmtParent.container;

        const name = path.node.id;

        // The continuation of a let expression is everything after it.
        // Walk up the VariableDeclaration before getting the siblings.
        const afterSibs = sibs.slice(thisPath + 1);

        if (afterSibs.length !== 0) {
            // Name the continuation as a function.
            const nk = path.scope.generateUidIdentifier('kl');

            // The occrances of {@code name} don't need to be replaced since the same
            // name is being used as the param.
            const kont = namedFunction(nk, name, afterSibs);

            // Insert the named kont before the let expression.
            stmtParent.insertBefore(kont);

            // Remove the siblings that were added above.
            for (let i = thisPath + 1; i < sibs.length; i += 1) {
                stmtParent.container.pop();
            }

            if (path.findParent(path => path.isFunction()) !== null) {
                // Add call to the named kont
                stmtParent.insertAfter(t.returnStatement(t.callExpression(nk, [name])));
            } else {
                stmtParent.insertAfter(t.expressionStatement(t.callExpression(nk, [name])));
            }
        }
    }
}

export function transform(babel) {
    return { callccVisitor };
};
