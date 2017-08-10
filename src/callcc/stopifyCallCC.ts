import callcc from './callcc';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from '../common/helpers';
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
  return t.callExpression(t.memberExpression(t.identifier('$__R'),
    t.identifier('captureCC')), [receiver]);
}

function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression(
      t.memberExpression(t.identifier("$__R"), t.identifier("suspend")),
      [top])));
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

const insertSuspend: Visitor = {
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
        h.letExpression(
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

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    path.stop();
    h.transformFromAst(path, [
      [cleanupGlobals, { allowed }],
      [hygiene, { reserved }],
      [markFlatFunctions, { optimize: true }]
    ]);
    h.transformFromAst(path, [() => ({ visitor: insertSuspend })]);
    h.transformFromAst(path, 
      [[callcc, { useReturn: true, captureMethod: state.opts.captureMethod }]]);
  }
}

export function plugin() {
  return {
    visitor: visitor
  };
}
