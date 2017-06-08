import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';

const markFuncName : t.Identifier = t.identifier('$mark_func')

const p : t.Identifier = t.identifier('f')
const tr : t.Identifier = t.identifier('$isTransformed')

const markFunc : t.FunctionDeclaration = t.functionDeclaration(
  markFuncName,
  [p],
  t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, tr),
      t.booleanLiteral(true))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, t.identifier('call')),
      h.directApply(t.callExpression(t.memberExpression(
        t.memberExpression(p, t.identifier('call')),
        t.identifier('bind')), [p])))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(t.memberExpression(p, t.identifier('call')), tr),
      t.booleanLiteral(true))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, t.identifier('apply')),
      h.directApply(t.callExpression(t.memberExpression(
        t.memberExpression(p, t.identifier('apply')),
        t.identifier('bind')), [p])))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(t.memberExpression(p, t.identifier('apply')), tr),
      t.booleanLiteral(true))),
    t.expressionStatement(t.callExpression(t.memberExpression(
      t.identifier('Object'), t.identifier('defineProperty')),
      [p, t.stringLiteral('length'), t.objectExpression(
        [t.objectProperty(t.identifier('configurable'), t.booleanLiteral(true)),
          t.objectProperty(t.identifier('value'), 
            t.binaryExpression('-', t.memberExpression(p, t.identifier('length')),
              t.numericLiteral(2)))])])),
    t.returnStatement(p)
  ])
)

const onError : t.FunctionDeclaration = (function () {
  const arg = t.identifier('arg');
  return t.functionDeclaration(
    t.identifier('onError'),
    [arg],
    t.blockStatement([
      t.throwStatement(t.newExpression(t.identifier('Error'),
        [t.templateLiteral([
          t.templateElement({
            raw: 'Unexpected error: ',
            cooked: 'Unexpected error: '
          }, false),
          t.templateElement({
            raw: '',
            cooked: ''
          }, true)
        ],[arg])]))
    ]));
})();

const applyWithK : t.FunctionDeclaration = (function () {
  const [ f, k, ek, args ] = ['f', 'k', 'ek', '...args'].map(id => t.identifier(id));
  const e = t.identifier('e');
  return t.functionDeclaration(
    t.identifier('applyWithK'),
    [f, k, ek, args],
    t.blockStatement([
      t.ifStatement(
        t.memberExpression(f, t.identifier('$isTransformed')),
        t.returnStatement(t.callExpression(f, [k, ek, args])),
        t.tryStatement(t.blockStatement([
          t.returnStatement(t.callExpression(k,
            [t.callExpression(f, [args])]))
        ]),
          t.catchClause(e, t.blockStatement([
            t.returnStatement(t.callExpression(ek, [e])) 
          ]))))
    ]));
})();

const call_applyWithK : t.FunctionDeclaration = (function () {
  const [ f, k, ek, args ] = ['f', 'k', 'ek', '...args'].map(id => t.identifier(id));
  const args_arr = t.identifier('args');
  const e = t.identifier('e');
  const hd = t.identifier('hd');
  const tl = t.identifier('...tail');
  return t.functionDeclaration(
    t.identifier('call_applyWithK'),
    [f, k, ek, args],
    t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(t.arrayPattern([hd, tl]), args_arr)
      ]),
      t.ifStatement(
        t.memberExpression(f, t.identifier('$isTransformed')),
        t.returnStatement(t.callExpression(t.memberExpression(f,
          t.identifier('call')), [hd, k, ek, tl])),
        t.tryStatement(t.blockStatement([
          t.returnStatement(t.callExpression(k,
            [t.callExpression(t.memberExpression(f, t.identifier('call')),
              [hd, tl])]))
        ]),
          t.catchClause(e, t.blockStatement([
            t.returnStatement(t.callExpression(ek, [e])) 
          ]))))
    ]));
})();

const apply_applyWithK : t.FunctionDeclaration = (function () {
  const [ f, k, ek, ths, args ] = ['f', 'k', 'ek', 'thisArg', 'args'].map(id => t.identifier(id));
  const args_dot = t.identifier('...args');
  const e = t.identifier('e');
  return t.functionDeclaration(
    t.identifier('apply_applyWithK'),
    [f, k, ek, ths, args],
    t.blockStatement([
      t.ifStatement(
        t.memberExpression(f, t.identifier('$isTransformed')),
        t.returnStatement(t.callExpression(t.memberExpression(f,
          t.identifier('apply')), [ths, t.arrayExpression([k, ek, args_dot])])),
        t.tryStatement(t.blockStatement([
          t.returnStatement(t.callExpression(k,
            [t.callExpression(t.memberExpression(f, t.identifier('apply')),
              [ths, args])]))
        ]),
          t.catchClause(e, t.blockStatement([
            t.returnStatement(t.callExpression(ek, [e])) 
          ]))))
    ]));
})();

const apply_helper : t.FunctionDeclaration = (function () {
  const counter = t.identifier('counter');
  const that = t.identifier('that');
  return t.functionDeclaration(t.identifier('apply_helper'),
    [t.identifier('how')],
    t.blockStatement([
      t.returnStatement(t.functionExpression(undefined,
        ['f', 'k', 'ek', '...args'].map(id => t.identifier(id)),
        t.blockStatement([
          t.ifStatement(t.binaryExpression('===',
            t.updateExpression('--', counter),
            t.numericLiteral(0)),
            t.blockStatement([
              t.expressionStatement(t.assignmentExpression('=', counter,
                t.memberExpression(that, t.identifier('interval')))),
              t.expressionStatement(t.callExpression(t.identifier('setTimeout'),
                [
                  t.arrowFunctionExpression([t.identifier('_')],
                    t.blockStatement([
                      t.ifStatement(t.callExpression(t.memberExpression(that,
                        t.identifier('isStop')), []),
                        t.expressionStatement(t.callExpression(
                          t.memberExpression(that, t.identifier('onStop')), [])),
                        t.returnStatement(t.callExpression(t.identifier('how'),
                          ['f', 'k', 'ek', '...args'].map(id => t.identifier(id)))))
                    ])),
                  t.numericLiteral(0)
                ]))
            ]),
            t.returnStatement(t.callExpression(t.identifier('how'),
              ['f', 'k', 'ek', '...args'].map(id => t.identifier(id)))))
        ])))
    ]));
})();

/*
let apply_helper = function (how: any) {
  return function (f: MaybeBound, k: any, ek: any, ...args: any[]) {
    if (counter-- === 0) {
      counter = that.interval;
      setTimeout(_ => {
        if (that.isStop()) {
          that.onStop();
        } else {
          return how(f, k, ek, ...args);
        }
      }, 0);
    } else {
      return how(f, k, ek, ...args);
    }
  };
};
*/

const admin_apply : t.VariableDeclaration = (function () {
  return h.letExpression(t.identifier('admin_apply'),
    t.callExpression(t.identifier('apply_helper'), [
      t.functionExpression(undefined,
        ['f', '...args'].map(id => t.identifier(id)),
        t.blockStatement([
          t.returnStatement(t.callExpression(t.identifier('f'),
            [t.identifier('...args')]))
        ]))
    ]),
    'const');
})();

const apply : t.VariableDeclaration = (function () {
  return h.letExpression(t.identifier('apply'),
    t.callExpression(t.identifier('apply_helper'), [
      t.functionExpression(undefined,
        ['f', 'k', 'ek', '...args'].map(id => t.identifier(id)),
        t.blockStatement([
          t.returnStatement(t.callExpression(t.identifier('applyWithK'),
            ['f', 'k', 'ek', '...args'].map(id => t.identifier(id))))
        ]))
    ]),
    'const');
})();

const call_apply : t.VariableDeclaration = (function () {
  return h.letExpression(t.identifier('call_apply'),
    t.callExpression(t.identifier('apply_helper'), [
      t.functionExpression(undefined,
        ['f', 'k', 'ek', '...args'].map(id => t.identifier(id)),
        t.blockStatement([
          t.returnStatement(t.callExpression(t.identifier('call_applyWithK'),
            ['f', 'k', 'ek', '...args'].map(id => t.identifier(id))))
        ]))
    ]),
    'const');
})();

const apply_apply : t.VariableDeclaration = (function () {
  return h.letExpression(t.identifier('apply_apply'),
    t.callExpression(t.identifier('apply_helper'), [
      t.functionExpression(undefined,
        ['f', 'k', 'ek', 'thisArg', 'args'].map(id => t.identifier(id)),
        t.blockStatement([
          t.returnStatement(t.callExpression(t.identifier('apply_applyWithK'),
            ['f', 'k', 'ek', 'thisArg', 'args'].map(id => t.identifier(id))))
        ]))
    ]),
    'const');
})();

/*
const that = this;
let counter = that.interval;
*/

const cpsRuntime : Visitor = {
  Program: {
    exit(path: NodePath<t.Program>): void {
      path.node.body.unshift(apply_apply);
      path.node.body.unshift(call_apply);
      path.node.body.unshift(apply);
      path.node.body.unshift(admin_apply);
      path.node.body.unshift(apply_helper);
      path.node.body.unshift(apply_applyWithK);
      path.node.body.unshift(call_applyWithK);
      path.node.body.unshift(applyWithK);
      path.node.body.unshift(onError);
      path.node.body.unshift(markFunc);

      path.node.body.unshift(h.letExpression(t.identifier('counter'),
        t.memberExpression(t.identifier('that'), t.identifier('interval'))));
      path.node.body.unshift(h.letExpression(t.identifier('that'),
        t.thisExpression()));
      path.node.body.unshift(t.expressionStatement(t.stringLiteral('use strict')));
      path.skip();
    }
  }
};

module.exports = function () {
  return { visitor: cpsRuntime };
}
