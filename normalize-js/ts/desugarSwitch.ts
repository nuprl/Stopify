/**
 * Desugars switch statements to if statements.
 *
 * switch(e1) {
 *   case c1:
 *     s1 ...
 *     break;
 *   case c2:
 *     s2 ...
 *   default:
 *     s3 ...
 * }
 *
 * is transformed into:
 *
  * _sw {
 *   let fallthrough = false;
 *   let test = e1;
 *   if (test === c1 || fallthroug) {
 *      s1 ...
 *      fallthrough = true;
 *      break sw;
 *   }
 *   if (test === c1 || fallthrough) {
 *      s1 ...
 *      fallthrough = true;
 *   }
 *   if (test === c1 || fallthrough) {
 *    s2 ...
 *    fallthrough = true;
 *   }
 *   s3 ...
 * }

 */
import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { letExpression, Break, breakLbl } from './helpers';

function ifTest(e: t.Expression,
  discriminant: t.Identifier,
  fallthrough: t.Identifier): t.LogicalExpression {
    return t.logicalExpression('||', t.binaryExpression('===', discriminant, e),
      fallthrough);
  }

function desugarCases(cases: t.SwitchCase[],
  discriminant: t.Identifier,
  fallthrough: t.Identifier): t.Statement[] {
    if (cases.length === 0) {
      return [];
    }

    const [hd, ...tail] = cases;
    const { test, consequent } = hd;

    if (test === null) {
      return consequent;
    } else {
      const cond = ifTest(test, discriminant, fallthrough);
      const newTail = desugarCases(tail, discriminant, fallthrough);
      newTail.unshift(t.ifStatement(cond,
        t.blockStatement([
          t.expressionStatement(t.assignmentExpression('=', fallthrough,
            t.booleanLiteral(true))),
          ...consequent
        ])));
      return newTail;
    }
  }

type S = {
  parentStack: (t.Identifier | false)[],
};

export const visitor : Visitor<S> = {
  Program(path, state) {
    state.parentStack = [];
  },
  Loop: {
    enter(path, state) {
      state.parentStack.push(false);
    },
    exit(path, state) {
      state.parentStack.pop();
    }
  },
  BreakStatement: function (path, state): void {
    const label = path.node.label;
    if (label) {
      return;
    }
    let topLabel = state.parentStack[state.parentStack.length - 1];
    if (topLabel === false) {
      return;
    }
    path.node.label = topLabel;
  },

  SwitchStatement: {
    enter(path: NodePath<Break<t.SwitchStatement>>, state): void {
      if (t.isLabeledStatement(path.parent)) {
        state.parentStack.push(path.parent.label);
        return;
      }

      const breakLabel = path.scope.generateUidIdentifier('switch');
      state.parentStack.push(breakLabel);
      const labeledStatement = t.labeledStatement(breakLabel, breakLbl(path.node, breakLabel));
      path.replaceWith(labeledStatement);
    },

    exit(path, state) {
      const { discriminant, cases } = path.node;
      const test = path.scope.generateUidIdentifier('test');
      const fallthrough = path.scope.generateUidIdentifier('fallthrough');
      let desugared : t.Statement[] = [];
      desugared.unshift(...desugarCases(cases, test, fallthrough));
      desugared.unshift(letExpression(fallthrough, t.booleanLiteral(false)));
      desugared.unshift(letExpression(test, discriminant));
      path.replaceWith(t.blockStatement(desugared));
      state.parentStack.pop();
    }
  }
};
