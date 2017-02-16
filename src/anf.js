/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
 */

const t = require('babel-types');
const h = require('./helpers.js');

// Object to contain the visitor functions
const visitor = {};

/** Document all the invariants that must hold for the anf phase.  */
//-----------------------------------------------------------------------------

// No break statements
visitor.BreakStatement = function BreakStatement(path) {
  throw new Error('Break statement encountered in the anf phase');
};

// No continue statments
visitor.ContinueStatement = function ContinueStatement(path) {
  throw new Error('Continue statement encountered in the anf phase');
};

// Only while loops must be present
visitor.Loop = function Loop(path) {
  if (t.isWhileStatement(path.node)) {
    throw new Error(`Error: Found ${path.node.type} during anf phase`);
  }
};

//-----------------------------------------------------------------------------

/** Transform while loops into tail recursive function calls.
 */
visitor.WhileStatement = function WhileStatement(path) {
  const node = path.node;
  const test = node.test;
  const body = node.body;

  // Name the function representing the while loop.
  const fName = path.scope.generateUidIdentifier('while');

  // Create the body for the function.
  const fBody = h.flatBodyStatement([
    t.ifStatement(test, h.flatBodyStatement([body,
      t.expressionStatement(t.callExpression(fName, []))]))]);
  // Create the function representing the while loop.
  const fExpr = t.functionExpression(fName, [], fBody);
  const fDecl = h.letExpression(fName, fExpr);
  path.replaceWith(h.flatBodyStatement([fDecl, t.expressionStatement(
          t.callExpression(fName, []))]));
};

visitor.ArrayExpression = function ArrayExpression(path) {
  const elems = path.node.elements.map((elem) => {
    if (h.isAtomic(elem) === false) {
      const na = path.scope.generateUidIdentifier('a');
      path.getStatementParent().insertBefore(h.letExpression(na, elem));
      return na;
    } else {
      return elem;
    }
  });

  path.node.elements = elems;
};

visitor.MemberExpression = function MemberExpression(path) {
  const p = path.node.property;

  if (h.isAtomic(p) === false) {
    const np = path.scope.generateUidIdentifier('p');
    path.getStatementParent().insertBefore(h.letExpression(np, p));
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

  if (t.isMemberExpression(l) && (h.isAtomic(l.property) === false)) {
    const prop = l.property;
    const np = path.scope.generateUidIdentifier('p');
    path.getStatementParent().insertBefore(h.letExpression(np, prop));
    path.node.left.property = np;
  }

  if (h.isAtomic(r) === false) {
    const nr = path.scope.generateUidIdentifier('r');
    path.getStatementParent().insertBefore(h.letExpression(nr, r));
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
  if (h.isAtomic(l) === false) {
    const nl = path.scope.generateUidIdentifier('l');
    path.getStatementParent().insertBefore(h.letExpression(nl, l));
    path.node.left = nl;
  }
  if (h.isAtomic(r) === false) {
    const nr = path.scope.generateUidIdentifier('r');
    path.getStatementParent().insertBefore(h.letExpression(nr, r));
    path.node.right = nr;
  }
};


 /**
  * Call expressions can only have atomic expressions as arguments.
  */
visitor.CallExpression = function CallExpression(path) {
  const args = path.node.arguments.map((arg) => {
    if (h.isAtomic(arg) === false) {
      const na = path.scope.generateUidIdentifier('a');
      path.getStatementParent().insertBefore(h.letExpression(na, arg));
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
  if (h.isAtomic(arg) === false) {
    const na = path.scope.generateUidIdentifier('a');
    path.getStatementParent().insertBefore(h.letExpression(na, arg));
    path.node.argument = na;
  }
};

module.exports = function transform(babel) {
  return { visitor };
};
