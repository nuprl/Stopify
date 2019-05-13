/**
 * This transformation preprocesses try statements for jumper.
 *
 * - Finally [FILL]
 *
 * - In a catch clause, the name of the captured exception is not 'var'-bound in
 *   the enclosing function. i.e., the following program throws an exception:
 *
 *     function F() {
 *       try {
 *         throw 'x';
 *       }
 *       catch(exn) {
 *       };
 *       return exn; // free identifier
 *     }
 *     F();
 *
 *   This makes it difficult to define the jumper transformation. This
 *   transformation turns every try-catch statement:
 *
 *     try { ... } catch (exn) { ... }
 *
 *   into:
 *
 *     var exn_; try { ... } catch (exn) { exn_ = exn; ... }
 *
 *   Consider what this entails for each mode of execution:
 *   - Normal mode: no change in semantics since 'exn_' is fresh
 *   - Capture mode: if a continuation is captured in the catch block, then
 *     the value of 'exn' is saved in 'exn_'
 *   - Restore mode: the block that restores variables restores the value of
 *     'exn_'. Therefore, jumper can transfer control to the catch block by
 *     'throw exn_'.
 */
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as bh from '@stopify/util';
import { fresh } from '@stopify/hygiene';

const returnSentinal = t.identifier('finally_rv');
const throwSentinal = t.identifier('finally_exn');
const sentinal = t.memberExpression(t.identifier('$__C'), t.identifier('RV_SENTINAL'));
const sentinalExn = t.memberExpression(t.identifier('$__C'), t.identifier('EXN_SENTINAL'));

type VisitorState = {
  inTryWithFinally: boolean,
  inTryBlockStack: boolean[]
};

const visitor: Visitor = {
  TryStatement: {
    enter(this: VisitorState, path: NodePath<t.TryStatement>) {
      if (path.node.finalizer) {
        this.inTryBlockStack.push(this.inTryWithFinally);
        this.inTryWithFinally = true;
      }
      if (path.node.handler) {
        const x = fresh('e');
        path.insertBefore(
          t.variableDeclaration('var', [t.variableDeclarator(x)]));
        (<any>path.node.handler).eVar = x;
        path.node.handler.body.body.unshift(
          t.expressionStatement( t.assignmentExpression('=', x,
            path.node.handler.param)));
        if (path.node.finalizer) {
          path.node.handler.body.body.unshift(
            t.expressionStatement(t.assignmentExpression('=', throwSentinal,
              sentinalExn)));
        }
      }
    },
    exit(this: VisitorState, path: NodePath<t.TryStatement>): void {
      if (path.node.finalizer) {
        // NOTE(arjun): If we have several finally blocks in the same scope,
        // this probably creates duplicate declarations.
        const sentinalDecl0 = t.variableDeclaration('let', [
            t.variableDeclarator(returnSentinal, sentinal) ]);
        const sentinalDecl1 = t.variableDeclaration('let', [
            t.variableDeclarator(throwSentinal, sentinalExn),
          ]);
        bh.enclosingScopeBlock(path).unshift(sentinalDecl0);
        bh.enclosingScopeBlock(path).unshift(sentinalDecl1);
        path.node.finalizer.body.push(bh.sIf(t.binaryExpression('!==',
          returnSentinal, sentinal),
          t.returnStatement(returnSentinal),
          bh.sIf(t.binaryExpression('!==', throwSentinal, sentinalExn),
            t.throwStatement(throwSentinal))));
      }
      this.inTryWithFinally = this.inTryBlockStack.pop()!;
    }
  },

  ReturnStatement: {
    exit(this: VisitorState, path: NodePath<t.ReturnStatement>) {
      if (this.inTryWithFinally) {
        const arg = path.node.argument ||
          t.unaryExpression('void', t.numericLiteral(0));
        path.insertBefore(t.expressionStatement(t.assignmentExpression('=',
          returnSentinal, arg)));
        path.replaceWith(t.returnStatement(returnSentinal));
        path.skip();
      }
    }
  },

  ThrowStatement: {
    exit(this: VisitorState, path: NodePath<t.ThrowStatement>) {
      if (this.inTryWithFinally) {
        const arg = path.node.argument ||
          t.unaryExpression('void', t.numericLiteral(0));
        path.insertBefore(t.expressionStatement(t.assignmentExpression('=',
          throwSentinal, arg)));
        path.replaceWith(t.throwStatement(throwSentinal));
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
}
