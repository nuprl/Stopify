import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {letExpression} from '../common/helpers';


const containsCallVisitor = {
  FunctionExpression(path: NodePath<t.FunctionExpression>): void {
    path.skip();
  },

  CallExpression(path: NodePath<t.CallExpression>) {
    this.containsCall = true;
    path.stop();
  }
};

function containsCall<T>(path: NodePath<T>) {
  let o = { containsCall: false };
  path.traverse(containsCallVisitor, o);
  return o.containsCall;
}

export const visitor: Visitor = {
  WhileStatement(path: NodePath<t.WhileStatement>) {
    if (!containsCall(path.get('test'))) {
      return;
    }
    const test = path.node.test;
    path.get('test').replaceWith(t.booleanLiteral(true));
    path.get('body').replaceWith(t.blockStatement([
      t.ifStatement(test, path.node.body, t.breakStatement())
    ]));
  },

  LogicalExpression(path: NodePath<t.LogicalExpression>) {
    if (!containsCall(path)) {
      return;
    }

    const op = path.node.operator;
    const stmt = path.getStatementParent();
    const r = stmt.scope.generateUidIdentifier(op === "&&" ? "and" : "or");
    const lhs = stmt.scope.generateUidIdentifier("lhs");


    stmt.insertBefore(letExpression(lhs, path.node.left));
    stmt.insertBefore(
      t.variableDeclaration("let", [t.variableDeclarator(r)]));

    const x = t.blockStatement([t.expressionStatement(
      t.assignmentExpression("=", r, path.node.right))]);
    const y = t.blockStatement([t.expressionStatement(
      t.assignmentExpression("=", r, lhs))]);

    if (op === "&&") {
      stmt.insertBefore(t.ifStatement(lhs, x, y));
    }
    else {
      stmt.insertBefore(t.ifStatement(lhs, y, x));
    }
    path.replaceWith(r);
  },

  ConditionalExpression(path: NodePath<t.ConditionalExpression>) {
    if (!containsCall(path)) {
      return;
    }

    const r = path.scope.generateUidIdentifier("cond");
    const test = path.scope.generateUidIdentifier("test");

    const stmt = path.getStatementParent();
    stmt.insertBefore(
      t.variableDeclaration("let", [t.variableDeclarator(r)]));
    stmt.insertBefore(
      t.variableDeclaration(
        "const",
        [t.variableDeclarator(test, path.node.test)]));
    stmt.insertBefore(
      t.ifStatement(
        test,
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression("=", r, path.node.consequent))]),
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression("=", r, path.node.alternate))])
      ));
    path.replaceWith(r);
  }
}
