import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import * as h from './helpers';

type Transformed<T> = T & {
  isTransformed?: boolean
}

function transformed<N>(n: Transformed<N>): Transformed<N> {
  n.isTransformed = true;
  return n;
}

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'), [t.callExpression(t.identifier('$runProg'), [])]))

const ifYield = t.ifStatement(
  t.binaryExpression('===',
    t.identifier('$counter'),
    t.identifier('$yieldCounter')
  ),
  t.blockStatement([
    t.expressionStatement(
      t.assignmentExpression('=', t.identifier('$counter'), t.numericLiteral(0))
    ),
    t.expressionStatement(
      t.yieldExpression(t.numericLiteral(0), false)
    )
  ]),
  t.blockStatement([
    t.expressionStatement(
      t.updateExpression('++', t.identifier('$counter'), false)
    )
  ])
)

const program : VisitNode<t.Program> = {
  enter: function (path: NodePath<t.Program>): void {
    const lastLine = <t.Statement>path.node.body.pop();
    if(t.isExpressionStatement(lastLine)) {
      let result = t.returnStatement(lastLine.expression);
      path.node.body.push(result);
    } else {
      path.node.body.push(lastLine)
    }
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [...path.node.body, runProg]
  },
};

// NOTE(rachit): Assumes that all functions in the call expression are
// identifiers.
const callExpression: VisitNode<Transformed<t.CallExpression>> =
  function (path: NodePath<Transformed<t.CallExpression>>): void {
    const exp = path.node;
    if(exp.isTransformed) return
    else exp.isTransformed = true;

    const cond = t.conditionalExpression(
      t.memberExpression(path.node.callee, t.identifier('$isGen')),
      t.yieldExpression(path.node, true),
      path.node)
    path.replaceWith(cond);
  };

const loop: VisitNode<t.Loop> = function (path: NodePath<t.Loop>): void {
  if (t.isBlockStatement(path.node.body)) {
    path.node.body.body.unshift(ifYield);
  } else {
    throw new Error('Body of loop is not a block statement')
  }
}

const funcd: VisitNode<t.FunctionDeclaration> =
  function (path: NodePath<t.FunctionDeclaration>): void {
  // Add a dummy yield at the top of the function to force it to pause.
  path.node.body.body.unshift(ifYield);
  path.node.generator = true;

  // Set isGen property on the function.
  const assign = t.assignmentExpression('=',
    t.memberExpression(path.node.id, t.identifier('$isGen')),
    t.booleanLiteral(true));
  const callAssign = t.assignmentExpression('=',
    t.memberExpression(
      t.memberExpression(path.node.id, t.identifier('call')),
      t.identifier('$isGen')),
    t.booleanLiteral(true)
  )
  const applyAssign = t.assignmentExpression('=',
    t.memberExpression(
      t.memberExpression(path.node.id, t.identifier('apply')),
      t.identifier('$isGen')),
    t.booleanLiteral(true)
  )

  path.insertAfter(t.expressionStatement(assign))
  path.insertAfter(t.expressionStatement(callAssign))
  path.insertAfter(t.expressionStatement(applyAssign))
};

const funce: VisitNode<t.FunctionExpression> =
  function (path: NodePath<t.FunctionExpression>): void {
    // Set isGen property on the function.
    const decl = path.parent;
    if (!t.isVariableDeclarator(decl)) {
      throw new Error(
        `Parent of function expression was ${decl.type} on line ${decl.loc.start.line}`)
    } else {
      path.node.body.body.unshift(ifYield);
      path.node.generator = true;

      // Decl will always be a variable so casting it to expression is fine.
      const assign = t.assignmentExpression('=',
        t.memberExpression(<t.Expression>decl.id, t.identifier('$isGen')),
        t.booleanLiteral(true))
      const callAssign = t.assignmentExpression('=',
        t.memberExpression(
          t.memberExpression(<t.Expression>decl.id, t.identifier('call')),
          t.identifier('$isGen')),
        t.booleanLiteral(true)
      )
      const applyAssign = t.assignmentExpression('=',
        t.memberExpression(
          t.memberExpression(<t.Expression>decl.id, t.identifier('apply')),
          t.identifier('$isGen')),
        t.booleanLiteral(true)
      )

      path.getStatementParent().insertAfter(t.expressionStatement(assign))
      path.getStatementParent().insertAfter(t.expressionStatement(callAssign))
      path.getStatementParent().insertAfter(t.expressionStatement(applyAssign))
    }
};

const newVisit: VisitNode<Transformed<t.NewExpression>> =
  function (path: NodePath<Transformed<t.NewExpression>>): void {
    if(path.node.isTransformed === true) return
    let objId = path.scope.generateUidIdentifier('obj');

    let emptyObj = t.objectExpression([]);

    path.getStatementParent().insertBefore(h.letExpression(objId, emptyObj));

    let callMember = t.memberExpression(path.node.callee, t.identifier('call'));
    let yieldCall = t.yieldExpression(
      transformed(t.callExpression(callMember, [objId, ...path.node.arguments])),
      true
    )
    const constructCall = t.conditionalExpression(
      t.memberExpression(path.node.callee, t.identifier('$isGen')),
      yieldCall,
      t.assignmentExpression('=', objId, transformed(path.node))
    )
    path.getStatementParent().insertBefore(constructCall);
    path.replaceWith(objId);

  };

const yieldVisitor: Visitor = {
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
  NewExpression: newVisit,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
