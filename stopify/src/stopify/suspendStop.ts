import { NodePath, Visitor } from '@babel/traverse';
import { CompilerOpts } from 'stopify-continuations-compiler';
import * as t from '@babel/types';

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

export const visitor: Visitor<{ opts: CompilerOpts }> = {
  FunctionDeclaration(path) {
    handleFunction(path);
  },

  FunctionExpression(path) {
    handleFunction(path);
  },

  Loop(path) {
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
    exit(path, { opts }) {
      if (opts.compileFunction) {
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
