import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression( t.memberExpression(t.identifier("$S"),
      t.identifier("suspend")), [])));
}

type BlockBody = {
  node: { body: t.BlockStatement }
};

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
    exit(path: NodePath<t.Program>, { opts }) {
      if(opts.compileFunction && !opts.eval) {
        if(path.node.body[0].type === 'FunctionDeclaration') {
          (<any>path.node.body[0]).topFunction = true;
        }
        else {
          throw new Error(
            `Compile function expected top-level functionDeclaration`);
        }
      }
    }
  },
};

export default function () {
  return { visitor: insertSuspend};
}
