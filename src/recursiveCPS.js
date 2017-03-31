/**
 * Module to CPS a simplified javascript AST.
 */

const t = require('babel-types');
const h = require('./helpers.js');

const visitor = {};

function isTerminating(node) {
  function isTerminatingDeclaration(d) {
    if (!t.isVariableDeclaration(d)) return false;
    const decls = d.declarations;
    return decls.map(decl => isTerminating(decl.init)).reduce((res, term) => res && term, true);
  }

  switch (node.type) {
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isTerminating(node.left) && isTerminating(node.right);
    case 'ExpressionStatement':
      return isTerminating(node.expression);
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return true;
    case 'VariableDeclaration':
      return isTerminatingDeclaration(node);
    case 'ReturnStatement':
      return isTerminating(node.argument);
    default:
      return h.isAtomic(node);
  }
}

function cpsM(m, path) {
  switch (m.type) {
    case 'Literal':
    case 'Identifier':
      return m;
    case 'BinaryExpression':
      return t.binaryExpression(m.operator, cpsM(m.left, path), cpsM(m.right, path));
    case 'LogicalExpression':
      return t.logicalExpression(m.operator, cpsM(m.left, path), cpsM(m.right, path));
    case 'VariableDeclaration':
      const decls = m.declarations;
      const f = x => cpsM(x, path);
      return t.variableDeclaration(m.kind, decls.map(f));
    case 'VariableDeclarator':
      return t.variableDeclarator(m.id, cpsM(m.init, path));
    case 'FunctionExpression':
      const { id, params, body } = m;
      const continuation = path.scope.generateUidIdentifier('k');
      const cpsBodyStatements = cps(body.body, path).map((x) => {
        if (t.isReturnStatement(x)) {
          return t.returnStatement(t.callExpression(continuation, x.argument));
        }
        return x;
      });
      const cpsBody = t.blockStatement(cpsBodyStatements);
      return t.functionExpression(id, [continuation].concat(params), cpsBody);
    default:
      return m;
  }
}

function cps(statements, path) {
  function cpsDecls(decls, continuation) {
    if (decls.length === 0) {
      return cps(continuation, path);
    }

    const [head, ...tail] = decls;

    if (isTerminating(head.init)) {
      return [head].concat(cpsDecls(tail, continuation));
    } else if (t.isCallExpression(head.init)) {
      const call = head.init;
      const cpsCallee = cpsM(call.callee, path);
      const cpsArguments = call.arguments.map(x => cpsM(x, path));
      const continuationId = head.id;
      const tailDecls = tail.length === 0 ? [] : [t.variableDeclaration('const', tail)];
      const continuationArg = t.functionExpression(null, [continuationId],
                      t.blockStatement(cps(tailDecls.concat(continuation), path)));
      return [t.expressionStatement(t.callExpression(cpsCallee,
                              [continuationArg].concat(cpsArguments)))];
    }
  }

  if (statements.length === 0) {
    return [];
  }

  const [head, ...tail] = statements;

  if (isTerminating(head)) {
    return [cpsM(head, path)].concat(cps(tail, path));
  } else if (t.isVariableDeclaration(head)) {
    const decls = head.declarations;
    return cpsDecls(decls, tail);
  } if (t.isBlockStatement(head)) {
    return [t.blockStatement(cps(head.body, path))].concat(cps(tail, path));
  }

  return statements;
}

visitor.Program = function (path) {
  const node = path.node;
  const { body } = node;

  node.body = cps(body, path);
};

module.exports = function transform(babel) {
  return { visitor };
};

