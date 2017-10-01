import * as t from 'babel-types';
import { NodePath } from 'babel-traverse'

function func(path: NodePath<t.FunctionDeclaration|t.FunctionExpression>) {
  const { body } = path.node.body;

  const afterDecls = Math.max(body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted), 0);

  const wrapped = t.blockStatement(body.slice(afterDecls));
  (<any>wrapped).merge = true
  path.node.body = t.blockStatement([...body.slice(0, afterDecls), wrapped])
}

const visitor = {
  FunctionDeclaration: func,
  FunctionExpression: func
}

export default function () {
  return { visitor }
}