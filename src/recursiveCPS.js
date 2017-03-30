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
      return true;
    case 'VariableDeclaration':
      return isTerminatingDeclaration(node);
    default:
      return h.isAtomic(node);
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
      const cpsCallee = cpsM(call.callee);
      const cpsArguments = call.arguments.map(x => cpsM(x));
      const continuationId = head.id;
      const tailDecls = tail.length === 0 ? [] : [t.variableDeclaration('const', tail)];
      const continuationArg = t.functionExpression(null, [continuationId],
                      t.blockStatement(cps(tailDecls.concat(continuation), path)));
      return [t.expressionStatement(t.callExpression(cpsCallee,
                              [continuationArg].concat(cpsArguments)))];
    }
  }

  function cpsM(m) {
    switch (m) {
      case 'Literal':
      case 'Identifier':
        return m;
      case 'BinaryExpression':
        return t.binaryExpression(m.operator, cpsM(m.left), cpsM(m.right));
      case 'LogicalExpression':
        return t.logicalExpression(m.operator, cpsM(m.left), cpsM(m.right));
      case 'VariableDeclaration':
        const decls = m.declarations;
        return t.variableDeclaration(m.kind, decls.map(cpsM));
      case 'VariableDeclarator':
        return t.variableDeclarator(m.id, cpsM(m.init));
      default:
        return m;
    }
  }

  if (statements.length === 0) {
    return [];
  }

  const [head, ...tail] = statements;

  if (isTerminating(head)) {
    return [cpsM(head)].concat(cps(tail, path));
  } else if (t.isVariableDeclaration(head)) {
    const decls = head.declarations;
    return cpsDecls(decls, tail);
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

