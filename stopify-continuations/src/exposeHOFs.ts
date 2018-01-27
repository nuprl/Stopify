import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

export const hofIdentifier = t.identifier('$hof');

const hofs = [ 'map', 'filter', 'reduce', 'forEach', 'sort' ];

function hof(obj: t.Expression, name: string, args: t.Expression[]): t.Expression {
  return t.callExpression(
    t.memberExpression(hofIdentifier, t.identifier(name)),
    [obj, ...args]);
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>): void {
    path.node.body.unshift(
      t.variableDeclaration('var',
      [t.variableDeclarator(hofIdentifier,
        t.callExpression(t.identifier('require'),
          [t.stringLiteral('stopify-continuations/dist/src/runtime/hofs.js')]))]));
  },
  CallExpression(path: NodePath<t.CallExpression>): void {
    const { callee, arguments: args } = path.node;
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) &&
      hofs.includes(callee.property.name)) {
      if (t.isIdentifier(callee.object) &&
        hofIdentifier.name === callee.object.name) {
        return;
      }
      path.replaceWith(hof(callee.object, callee.property.name, <any>args))
    }
  },
};

export function plugin() {
  return { visitor };
};

