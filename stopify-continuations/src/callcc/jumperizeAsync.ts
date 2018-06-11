import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import * as bh from '../babelHelpers';
import { fresh } from '../fastFreshId';

const captureExn = t.memberExpression(t.identifier('$__T'), t.identifier('Capture'));
const restoreExn = t.memberExpression(t.identifier('$__T'), t.identifier('Restore'));
const endTurnExn = t.memberExpression(t.identifier('$__T'), t.identifier('EndTurn'));

function handleAsync(path: NodePath<t.FunctionDeclaration|t.FunctionExpression>): void {
  if (path.node.async) {
    const { body } = path.node;
    const param = fresh('exn');
    const catchBody = t.ifStatement(bh.or(
      t.binaryExpression('instanceof', param, captureExn),
      t.binaryExpression('instanceof', param, restoreExn),
      t.binaryExpression('instanceof', param, endTurnExn)),
      t.returnStatement(param),
      t.throwStatement(param));
    const catchHandler = t.catchClause(param, t.blockStatement([
      catchBody,
    ]));
    (<any>catchHandler).eVar = param;
    const newBody = t.blockStatement([t.tryStatement(body, catchHandler)]);
    path.node.body = newBody;
  }
}

const visitor: Visitor = {
  FunctionDeclaration: function (path: NodePath<t.FunctionDeclaration>): void {
    return handleAsync(path);
  },
  FunctionExpression: function (path: NodePath<t.FunctionExpression>): void {
    return handleAsync(path);
  },
};

export default function () {
  return { visitor };
}

