// Helper functions for the anf transformation
/* Checks if the node is an atom */

const t = require('babel-types');

function isAtomic(node) {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function isTerminating(node) {
  return !t.isCallExpression(node);
}

function letExpression(name, value) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}

function flatten(seq) {
  return seq.reduce((prog, statements) => prog.concat(statements), []);
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
        else if (t.isEmptyStatement(e)) { } else {
          throw new Error(
          'Could not flatten body, element was not a statement');
        }
      });
    } else newBody.push(elem);
  });

  return t.blockStatement(newBody);
}

function isConsoleLog(node) {
  return t.isMemberExpression(node) &&
      t.isIdentifier(node.object) && node.object.name === 'console' &&
      t.isIdentifier(node.property) && node.property.name === 'log';
}

module.exports = {
  isAtomic, isTerminating, letExpression, flatten, flatBodyStatement,
  isConsoleLog,
};

