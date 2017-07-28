import callcc from './callcc';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { transform, letExpression, flatBodyStatement } from '../common/helpers';
import * as fs from 'fs';
import * as babylon from 'babylon';
import cleanupGlobals from '../common/cleanupGlobals';
import hygiene from '../common/hygiene';
import markFlatFunctions from '../common/markFlatFunctions';

const top = t.identifier("$top");
const isStop = t.identifier("$isStop");
const onStop = t.identifier("$onStop");
const onDone = t.identifier("$onDone");
const interval = t.identifier("$interval");
const result = t.identifier("$result");

const allowed = [
  "Object",
  "require",
  "console"
];

const reserved = [
  "$top",
  "$isStop",
  "$onStop",
  "$onDone",
  "$interval",
  "$result"
];

function appCaptureCC(receiver: t.Expression) {
  return t.callExpression(t.identifier("captureCC"), [receiver]);
}

function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression(
      t.memberExpression(t.identifier("$__R"), t.identifier("suspend")),
      [interval, top])));
}

type BlockBody = {
  node: { body: t.BlockStatement }
}

function handleFunction(path: NodePath<t.Node> & BlockBody) {
  if ((<any>path.node).mark === 'Flat') {
    return;
  }
  handleBlock(path.node.body);
}

const visitor: Visitor = {
  FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
    handleFunction(path);
  },

  FunctionExpression(path: NodePath<t.FunctionExpression>) {
    handleFunction(path);
  },

  Loop(path: NodePath<t.Loop>) {
    if (path.node.body.type === "BlockStatement") {
      handleBlock(path.node.body);
    }
    else {
      const body = t.blockStatement([path.node.body]);
      path.node.body = body;
      handleBlock(body);
    }
  },

  Program: {
    exit(path: NodePath<t.Program>) {
      path.node.body.push(
        t.returnStatement(
          t.callExpression(top, [t.stringLiteral("done")])));
      const body = t.blockStatement(path.node.body);
      path.node.body = [
        letExpression(
          result, appCaptureCC(t.functionExpression(undefined, [top],
            body))),
        t.ifStatement(
          t.binaryExpression("===", result, t.stringLiteral("done")),
          t.blockStatement([t.returnStatement(t.callExpression(onDone, []))]),
          t.ifStatement(
            t.callExpression(isStop, []),
            t.blockStatement([t.returnStatement(t.callExpression(onStop, []))]),
            t.returnStatement(
              t.callExpression(t.memberExpression(t.identifier("$__R"), t.identifier("resume")), [result]))))
      ];
    }
  },

}

function plugin() {
  return {
    visitor: visitor
  };
}


export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  opts.optimize = true;
  const r = transform(
    code, [
      [ [cleanupGlobals, { allowed }],
        [hygiene, { reserved }],
        markFlatFunctions
      ],
      [plugin],
      [[callcc, { useReturn: true, captureMethod: 'lazyErrVal' }]]
    ],
    opts);
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
