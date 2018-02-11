import { NodePath, Visitor } from "babel-traverse";
import * as t from "babel-types";

function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression( t.memberExpression(t.identifier("$S"),
      t.identifier("suspend")), [])));
}

interface BlockBody {
  node: { body: t.BlockStatement };
}

function handleFunction(path: NodePath<t.Node> & BlockBody) {
  if ((path.node as any).mark === "Flat") {
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
    } else {
      const body = t.blockStatement([path.node.body]);
      path.node.body = body;
      handleBlock(body);
    }
  },

  Program: {
    exit(path: NodePath<t.Program>, { opts }) {
      if (opts.compileFunction) {
        if (path.node.body[0].type === "FunctionDeclaration") {
          (path.node.body[0] as any).topFunction = true;
        } else {
          throw new Error(
            `Compile function expected top-level functionDeclaration`);
        }
      }
    },
  },
};

export default function() {
  return { visitor: insertSuspend};
}
