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
import * as bh from '../babelHelpers';
import { fresh } from '../fastFreshId';

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
      if (path.node.handler) {
        const x = fresh('e');
        path.insertBefore(
          t.variableDeclaration('var', [t.variableDeclarator(x)]));
        (<any>path.node.handler).eVar = x;
        path.node.handler.body.body.unshift(
          t.expressionStatement(
            t.assignmentExpression('=', x, path.node.handler.param)));
      }
    },
    exit(this: VisitorState, path: NodePath<t.TryStatement>): void {
      if (path.node.finalizer) {
        // NOTE(arjun): If we have several finally blocks in the same scope,
        // this probably creates duplicate declarations.
        const sentinalDecl = bh.varDecl(finallySentinal, sentinal);
        bh.enclosingScopeBlock(path).unshift(sentinalDecl);
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
        const arg = path.node.argument ||
          t.unaryExpression('void', t.numericLiteral(0))
        path.insertBefore(t.expressionStatement(t.assignmentExpression('=',
          finallySentinal, arg)));
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
