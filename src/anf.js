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
 */

const t = require('babel-types');

/* Checks if the node is an atom */
function isAtomic(node) {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function isValidLetRhs(node) {
  if (t.isBinaryExpression(node)) {
    return isAtomic(node.left) && isAtomic(node.right);
  } else if (t.isCallExpression(node)) {
    return node.arguments.map(x => isAtomic(x)).reduce((x, y) => x && y);
  } else {
    return isAtomic(node);
  }
}

function letExpression(name, value) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)])
}

module.exports = function transform(babel) {
  return {
    visitor: {
      BinaryExpression(path) {
        const l = path.node.left;
        const r = path.node.right;

        // Replace for `r` needs to be inside because of the way
        // side effects can occur when evaluating the binary expression.
        if (isAtomic(r) === false) {
          const nr = path.scope.generateUidIdentifier('r');
          path.insertBefore(letExpression(nr, r));
          path.node.right = nr;
        }
        if (isAtomic(l) === false) {
          const nl = path.scope.generateUidIdentifier('l');
          path.insertBefore(letExpression(nl, l));
          path.node.left = nl;
        }
      },
    },
  };
};
