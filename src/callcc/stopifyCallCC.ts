import * as callcc from './callcc';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { transform, letExpression, flatBodyStatement } from '../common/helpers';
import * as fs from 'fs';
import * as babylon from 'babylon';

const top = t.identifier("$top");
const isStop = t.identifier("$isStop");
const onStop = t.identifier("$onStop");
const onDone = t.identifier("$onDone");
const interval = t.identifier("$interval");
const result = t.identifier("$result");

function appCallCC(receiver: t.Expression) {
  return t.callExpression(
    t.memberExpression(t.identifier("$__R"), t.identifier("callCC")),
    [receiver]);
}

function handleFunction(path: NodePath<t.Function>, body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(appCallCC(top)));
}

const bodyVisitor = {
  FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
    handleFunction(path, path.node.body);
  },
  FunctionExpression(path: NodePath<t.FunctionExpression>) {
    handleFunction(path, path.node.body);
  },
  WhileStatement(path: NodePath<t.WhileStatement>) {
    path.node.body =
      flatBodyStatement([t.expressionStatement(appCallCC(top)),
                         path.node.body]);
  }
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    path.node.body.push(t.returnStatement(t.stringLiteral("done")));
    const body = t.blockStatement(path.node.body);
    path.traverse(bodyVisitor);
    path.node.body = [
      letExpression(
        result, appCallCC(t.functionExpression(undefined, [top],
                                               body))),
      t.ifStatement(
        t.binaryExpression("===", result, t.stringLiteral("done")),
        t.blockStatement([t.returnStatement(t.callExpression(onDone, []))]),
        t.ifStatement(
          t.callExpression(isStop, []),
          t.blockStatement([t.returnStatement(t.callExpression(onStop, []))]),
          t.returnStatement(
            t.callExpression(
              t.identifier("setTimeout"),
              [t.functionExpression(
                undefined,
                [],
                t.blockStatement([t.returnStatement(t.callExpression(result, []))])), t.numericLiteral(0)]))))
    ];
  },

}

function plugin() {
  return {
    visitor: visitor
  };
}


export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const r = transform(
    code,
    [[plugin],
     [[callcc, { useReturn: true }]]],
    { debug: false, optimize: false, tail_calls: false, no_eval: false });
  return r.code.slice(0, -1); // TODO(arjun): hack to deal with string/visitor mismatch
}

export const callCCStopify: stopifyFunction = (code, opts) => {
  return eval(callCCStopifyPrint(code, opts));

}


function main() {
  const filename = process.argv[2];
  const code = fs.readFileSync(filename, 'utf-8').toString();
  const opts = { debug: false, optimize: false, tail_calls: false, no_eval: false };
  console.log(callCCStopifyPrint(code, opts));
}

if (require.main === module) {
  main();
}
