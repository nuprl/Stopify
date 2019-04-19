import { Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import * as imm from 'immutable';
import { runtimePath } from './helpers';
import { CompilerOpts } from './types';

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

const implicitsPath = `${runtimePath}/implicitApps`;


export const visitor: Visitor<{ opts: CompilerOpts }> = {
  Program(path, state) {
    const opts = state.opts;
    if (!opts.requireRuntime) {
      return;
    }

    path.node.body.unshift(
      t.variableDeclaration('var',
      [t.variableDeclarator(implicitsIdentifier,
         t.callExpression(t.identifier('require'),
           [t.stringLiteral(implicitsPath)]))]));
  },
  BinaryExpression(path) {
    const fun = binopTable.get(path.node.operator);
    if (typeof fun !== 'string') {
      return;
    }
    path.replaceWith(implicit(fun, path.node.left, path.node.right));
  },
  MemberExpression: {
    exit(path) {
      if (!path.node.computed) {
        return;
      }
      path.node.property = implicit('toKey', path.node.property);
    }
  }
};
