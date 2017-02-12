/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
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

visitor.ArrayExpression = function ArrayExpression(path) {
  const elems = path.node.elements.map((elem) => {
    if (isAtomic(elem) === false) {
      const na = path.scope.generateUidIdentifier('a');
      path.getStatementParent().insertBefore(letExpression(na, elem));
      return na;
    } else {
      return elem;
    }
  });

  path.node.elements = elems;
};

visitor.MemberExpression = function MemberExpression(path) {
  const p = path.node.property;

  if (isAtomic(p) === false) {
    const np = path.scope.generateUidIdentifier('p');
    path.getStatementParent().insertBefore(letExpression(np, p));
    path.node.property = np;
  }
};

/**
 * Even though MemberExpression can handle the LHS being a complex
 * object access, we handle it separately since the LHS can be nonAtomic, i.e.,
 * of the form a[1] whereas in every other context a member access
 * is not consider atomic.
 */
visitor.AssignmentExpression = function AssignmentExpression(path) {
  const r = path.node.right;
  const l = path.node.left;

  if (t.isMemberExpression(l) && (isAtomic(l.property) === false)) {
    const prop = l.property;
    const np = path.scope.generateUidIdentifier('p');
    path.getStatementParent().insertBefore(letExpression(np, prop));
    path.node.left.property = np;
  }

  if (isAtomic(r) === false) {
    const nr = path.scope.generateUidIdentifier('r');
    path.getStatementParent().insertBefore(letExpression(nr, r));
    path.node.right = nr;
  }
};

 /**
  * Visitor function for binary expressions and logical expressions.
  * Binary expressions can only have atomic expressions as arguments.
  * The insertion makes use of getStatementPath() to get to the statement
  * in order to insert the let binding. Simply inserting the let binding
  * will break complex examples.
  */
visitor['BinaryExpression|LogicalExpression'] =
function BinaryExpression(path) {
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
