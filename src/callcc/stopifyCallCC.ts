import callcc from './callcc';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from '../common/helpers';
import * as fs from 'fs';
import * as babylon from 'babylon';
import cleanupGlobals from '../common/cleanupGlobals';
import hygiene from '../common/hygiene';
import markFlatFunctions from '../common/markFlatFunctions';
import * as fastFreshId from '../fastFreshId';
import markFlatApplications from '../common/markFlatApplications'
import { knowns } from '../common/cannotCapture'

const top = t.identifier("$top");
const isStop = t.identifier("$isStop");
const onStop = t.identifier("$onStop");
const onDone = t.identifier("$onDone");
const opts = t.identifier("$opts");
const result = t.identifier("$result");

const allowed = [
  "Object",
  "exports",
  "require",
  "console",
  "global",
  "setTimeout"
];

const reserved = [
  ...knowns,
  "$opts",
  "$result",
  "target",
  "newTarget",
  "SENTINAL",
  "finally_rv",
];


function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression(
      t.memberExpression(t.identifier("$__R"), t.identifier("suspend")), [])));
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
  }
}

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    path.stop();
    fastFreshId.init(path);
    h.transformFromAst(path, [
      [cleanupGlobals, { allowed }],
      [hygiene, { reserved }],
      [markFlatFunctions]
    ]);
    h.transformFromAst(path, [markFlatApplications])
    h.transformFromAst(path, [() => ({ visitor: insertSuspend })]);
    h.transformFromAst(path,
      [[callcc, {
        useReturn: true,
        captureMethod: state.opts.captureMethod,
        handleNew: state.opts.handleNew
      }]]);
  }
}

export function plugin() {
  return {
    visitor: visitor
  };
}
