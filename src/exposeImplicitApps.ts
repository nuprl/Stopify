import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as bh from './babelHelpers';
import * as imm from 'immutable';

export const implicitsIdentifier = t.identifier('$i');

const binopTable = imm.Map<string,string>([
  ['+', 'add'],
  ['-', 'sub'],
  ['/', 'div'],
  ['*', 'mul']]);

function implicit(name: string, ...args: t.Expression[]): t.Expression {
  return t.callExpression(
    t.memberExpression(implicitsIdentifier, t.identifier(name)),
    args);
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    path.node.body.unshift(
      t.variableDeclaration('var',
      [t.variableDeclarator(implicitsIdentifier,
        t.callExpression(t.identifier('require'),
          [t.stringLiteral('Stopify/built/src/runtime/implicitApps')]))]));
  },
  BinaryExpression(path: NodePath<t.BinaryExpression>) {
    const fun = binopTable.get(path.node.operator);
    if (typeof fun !== 'string') {
      return;
    }
    path.replaceWith(implicit(fun, path.node.left, path.node.right));
  }

};

export function plugin() {
  return { visitor };
};
