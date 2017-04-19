// Helper functions for the anf transformation
/* Checks if the node is an atom */

import * as t from 'babel-types';

function isAtomic(node: t.Node): boolean {
  return t.isLiteral(node) || t.isIdentifier(node);
}

function isTerminating(node: t.Node): boolean {
  return !t.isCallExpression(node);
}

function letExpression(name: t.Identifier, value: t.Expression): t.VariableDeclaration {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}

function flatten(seq: t.Statement[]): t.Statement[] {
  return seq.reduce((prog, statements) => prog.concat(statements), []);
}

/**
 * Use this when the contents of the body need to be flattened.
 * @param body An array of statements
 */
function flatBodyStatement(body: t.Statement[]): t.BlockStatement {
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

function isConsoleLog(node: t.Node): boolean {
  return t.isMemberExpression(node) &&
      t.isIdentifier(node.object) && node.object.name === 'console' &&
      t.isIdentifier(node.property) && node.property.name === 'log';
}

export {
  isAtomic,
  isTerminating,
  letExpression,
  flatten,
  flatBodyStatement,
  isConsoleLog,
};

