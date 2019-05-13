/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import { NodePath } from 'babel-traverse';
import { letExpression } from '@stopify/util';

import { FlatnessMark } from '../helpers';
import { CompilerOpts } from '../types';
import * as t from 'babel-types';

import { knowns } from './cannotCapture';

/**
 * function handleNew(constr, ...args) {
 *
 *   if (common.knownBuiltIns.includes(constr)) {
 *     return new constr(...args);
 *   }
 *
 *   const obj = Object.create(constr.prototype);
 *   const result = constr.apply(obj, args);
 *
 *   return (typeof result === 'object') ? result : obj;
 *
 * }
 */
module.exports = function () {
  return {
    visitor: {
      Program: {
        exit(path: NodePath<t.Program>, state: {opts: CompilerOpts}) {
          if (!state.opts.compileFunction) {
            const constr = t.identifier('constr');
            const args = t.identifier('args');
            const knownTest = t.callExpression(
              t.memberExpression(
                t.memberExpression(t.identifier('$__C'), t.identifier('knownBuiltIns')),
                t.identifier('includes')),
              [constr]);
            (<any>knownTest).mark = 'Flat';
            const flatNew = t.newExpression(constr, [t.spreadElement(args)]);
            (<any>flatNew).mark = 'Flat';
            const knownIf = t.ifStatement(knownTest, t.returnStatement(flatNew));

            const obj = t.identifier('obj');
            const createCall = t.callExpression(
              t.memberExpression(t.identifier('Object'), t.identifier('create')),
              [t.memberExpression(constr, t.identifier('prototype'))]);
            (<any>createCall).mark = 'Flat';
            const createObj = letExpression(obj, createCall, 'const');

            const result = t.identifier('result');
            const applyConstr = letExpression(result, t.callExpression(
              t.memberExpression(constr, t.identifier('apply')), [obj, args]),
              'const');

            const returnObj = t.returnStatement(
              t.conditionalExpression(
                t.binaryExpression('===',
                  t.unaryExpression('typeof', result), t.stringLiteral('object')),
                result, obj));

            const handleNewFunction = t.functionDeclaration(
              t.identifier('handleNew'), [constr, t.restElement(args)],
              t.blockStatement([
                knownIf,
                createObj,
                applyConstr,
                returnObj
              ]));

            path.node.body.unshift(handleNewFunction);
          }
        }
      },
      NewExpression(path: NodePath<FlatnessMark<t.NewExpression>>) {
        if (path.node.mark === 'Flat') {
          return;
        }
        if (t.isIdentifier(path.node.callee) &&
          knowns.includes(path.node.callee.name)) {
          return;
        }
        const { callee, arguments: args } = path.node;
        if(t.isIdentifier(callee) && knowns.includes(callee.name)) {
          return;
        }
        path.replaceWith(t.callExpression(
          t.identifier('handleNew'),
          [callee, ...args]));
      }
    }
  };
};
