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

/* Checks if the node is an atom */
function isAtomic(node) {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function letExpression(name, value) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}

// Object to contain the visitor functions
const visitor = {};

 /**
  * Visitor function for binary expressions and logical expressions.
  * Binary expressions can only have atomic expressions as arguments.
  * The insertion makes use of getStatementPath() to get to the statement
  * in order to insert the let binding. Simply inserting the let binding
  * will break complex examples.
  */
visitor['BinaryExpression|LogicalExpression'] = function BinaryExpression(path) {
  const l = path.node.left;
  const r = path.node.right;

  // Replace for `r` needs to be inside because of the way
  // side effects can occur when evaluating the binary expression.
  if (isAtomic(l) === false) {
    const nl = path.scope.generateUidIdentifier('l');
    path.getStatementParent().insertBefore(letExpression(nl, l));
    path.node.left = nl;
  }
  if (isAtomic(r) === false) {
    const nr = path.scope.generateUidIdentifier('r');
    path.getStatementParent().insertBefore(letExpression(nr, r));
    path.node.right = nr;
  }
};


 /**
  * Call expressions can only have atomic expressions as arguments.
  */
visitor.CallExpression = function CallExpression(path) {
  const args = path.node.arguments.map((arg) => {
    if (isAtomic(arg) === false) {
      const na = path.scope.generateUidIdentifier('a');
      path.getStatementParent().insertBefore(letExpression(na, arg));
      return na;
    } else {
      return arg;
    }
  });

  path.node.arguments = args;
};

/**
 * Return statements can only have atomic expressions as arguments.
 */
visitor.ReturnStatement = function ReturnStatement(path) {
  const arg = path.node.argument;
  if (isAtomic(arg) === false) {
    const na = path.scope.generateUidIdentifier('a');
    path.getStatementParent().insertBefore(letExpression(na, arg));
    path.node.argument = na;
  }
};

module.exports = function transform(babel) {
  return { visitor };
};
