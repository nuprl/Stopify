/**
 * Plugin to prepend continuation argument to function params
 */

import * as t from 'babel-types';

const addKArgVisitor = { 
    ['FunctionDeclaration|FunctionExpression']: function (path) {
        const k = path.scope.generateUidIdentifier('k');
        path.node.params = [k, ...path.node.params];
    },

    ReturnStatement: function (path) {
        const functionParent = path.findParent(x => x.isFunction());
        path.node.kArg = functionParent.node.params[0];

        if (path.node.argument === null) {
            path.node.argument = t.unaryExpression('void', t.numericLiteral(0));
        }
    }
}

module.exports = function (babel) {
    return { visitor: addKArgVisitor };
};
