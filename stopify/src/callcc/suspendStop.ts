import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';

const opts = t.identifier("$opts");
const result = t.identifier("$result");

const directSuspendVisitor: Visitor = {
  Function(path: NodePath<t.Function>) {
    path.skip();
  },
  Loop(path: NodePath<t.Loop>) {
    this.directSuspend = true;
    path.skip();
  },
  IfStatement(path: NodePath<t.IfStatement>) {
    path.skip();
  },
  SwitchStatement(path: NodePath<t.SwitchStatement>) {
    path.skip();
  }
};

/**
 * Traverses children of `path` and returns true if it contains any applications.
 */
export function directSuspend<T>(path: NodePath<T>) {
  let o = { directSuspend: false };
  path.traverse(directSuspendVisitor, o);
  return o.directSuspend;
}

function handleBlock(body: t.BlockStatement) {
  body.body.unshift(t.expressionStatement(
    t.callExpression( t.memberExpression(t.identifier("$__R"),
      t.identifier("suspend")), [])));
}

type BlockBody = {
  node: { body: t.BlockStatement }
}

function handleFunction(path: NodePath<t.Node> & BlockBody) {
  if ((<any>path.node).mark === 'Flat') {
    return;
  }
  if (directSuspend(path.get('body'))) {
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
      if (directSuspend(path.get('body'))) {
        return;
      }
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
      if(opts.compileFunction) {
        if(path.node.body[0].type === 'FunctionDeclaration') {
          (<any>path.node.body[0]).topFunction = true
        }
        else {
          throw new Error(
            `Compile function expected top-level functionDeclaration`)
        }
      }
    }
  },
}

export default function () {
  return { visitor: insertSuspend};
}
