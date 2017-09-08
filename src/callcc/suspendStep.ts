import { NodePath, Visitor } from 'babel-traverse';
import { SourceMapConsumer } from 'source-map';
import * as t from 'babel-types';
import {letExpression, LineMapping} from '../common/helpers';

interface Options {
  sourceMap: LineMapping;
}

const top = t.identifier("$top");
const isStop = t.identifier("$isStop");
const onStop = t.identifier("$onStop");
const onDone = t.identifier("$onDone");
const opts = t.identifier("$opts");
const result = t.identifier("$result");

function appCaptureCC(receiver: t.Expression) {
  return t.callExpression(t.memberExpression(t.identifier('$__R'),
    t.identifier('captureCC')), [receiver]);
}

const insertSuspend: Visitor = {
  BlockStatement(path: NodePath<t.BlockStatement>, s: { opts: Options }): void {
    const { body } = path.node;
    let j = 0;
    if (body.length === 0) {
      path.node.body = [
        t.expressionStatement(t.callExpression( t.memberExpression(
          t.identifier("$__R"), t.identifier("suspend")), [top]))
      ];
    } else {
      body.forEach((v, i) => body.splice(i+(j++), 0, t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier("$__R"), t.identifier("suspend")),
          [top]))));
    }
  },

  IfStatement(path: NodePath<t.IfStatement>): void {
    if (path.node.consequent.type !== "BlockStatement") {
      const block = t.blockStatement([path.node.consequent]);
      path.node.consequent = block;
    }
    if (path.node.alternate &&
      path.node.alternate.type !== "BlockStatement") {
      const block = t.blockStatement([path.node.alternate]);
      path.node.alternate = block;
    }
  },

  Loop(path: NodePath<t.Loop>): void {
    if (path.node.body.type !== "BlockStatement") {
      const body = t.blockStatement([path.node.body]);
      path.node.body = body;
    }
  },

  Program: {
    exit(path: NodePath<t.Program>): void {
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

export default function () {
  return { visitor: insertSuspend};
}
