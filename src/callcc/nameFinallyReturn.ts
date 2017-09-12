import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';
import * as bh from '../babelHelpers';

const finallySentinal = t.identifier('finally_rv');
const sentinal = t.identifier('SENTINAL');

type VisitorState = {
  inTryWithFinally: boolean,
  inTryBlockStack: boolean[]
}

const visitor: Visitor = {
  TryStatement: {
    enter(this: VisitorState, path: NodePath<t.TryStatement>) {
      if (path.node.finalizer) {
        this.inTryBlockStack.push(this.inTryWithFinally);
        this.inTryWithFinally = true;
      }
    },
    exit(this: VisitorState, path: NodePath<t.TryStatement>): void {
      if (path.node.finalizer) {
        const funParent = path.getFunctionParent();
        const bodyPath = <NodePath<t.BlockStatement>>funParent.get('body');
        const sentinalDecl = letExpression(finallySentinal, sentinal, 'var');
        (<any>sentinalDecl).lifted = true;
        bodyPath.node.body.unshift(sentinalDecl);
        path.node.finalizer.body.push(bh.sIf(t.binaryExpression('!==',
          finallySentinal, sentinal),
          t.returnStatement(finallySentinal)));
      }
      this.inTryWithFinally = this.inTryBlockStack.pop()!;
    }
  },

  ReturnStatement: {
    exit(this: VisitorState, path: NodePath<t.ReturnStatement>) {
      if (this.inTryWithFinally) {
        path.insertBefore(t.expressionStatement(t.assignmentExpression('=',
          finallySentinal, path.node.argument)));
        path.replaceWith(t.returnStatement(finallySentinal));
        path.skip();
      }
    }
  },

  Function: {
    enter(this: VisitorState, path: NodePath<t.Function>) {
      this.inTryBlockStack.push(this.inTryWithFinally);
      this.inTryWithFinally = false;
    },
    exit(this: VisitorState, path: NodePath<t.Function>) {
      this.inTryWithFinally = this.inTryBlockStack.pop()!;
    }
  },

  Program: {
    enter(this: VisitorState, path: NodePath<t.Program>) {
      this.inTryWithFinally = false;
      this.inTryBlockStack = [];
    }
  },
};

export default function () {
  return { visitor };
};
