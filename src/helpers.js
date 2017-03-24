// Helper functions for the anf transformation
/* Checks if the node is an atom */

const t = require('babel-types');

function isAtomic(node) {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function letExpression(name, value) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}

/**
 * Use this when the contents of the body need to be flattened.
 * @param body An array of statements
 */
function flatBodyStatement(body) {
  const newBody = [];
  body.forEach((elem) => {
    if (t.isBlockStatement(elem)) {
      elem.body.forEach((e) => {
        if (t.isStatement(e)) newBody.push(e);
        else if (t.isEmptyStatement(e)) { }
        else {
          throw new Error(
          'Could not flatten body, element was not a statement');
        }
      });
    } else newBody.push(elem);
  });

  return t.blockStatement(newBody);
}

module.exports = { isAtomic, letExpression, flatBodyStatement };
