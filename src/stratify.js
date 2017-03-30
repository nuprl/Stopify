/**
 * Module to stratify a simplified javascript AST. Under our assumptions, programs can only diverge
 * at function call-sites. We name every function application to ease the implementation of further
 * transforming ASTs to insert checkpoints at each application.
 *
 * We stratify an AST `e` into terms `m` that _must_ terminate, and terms `p` that are _possibly
 * non-termination_.
 *
 * Must Terminate m ::=
 *   c | x | m_1 op m_2 | if (m_1) { m_2 } else { m_3 } | function(x,...) { p } | let x = m_1; m_2
 *
 * Possibly Nonterminating p ::=
 *   m | let x = m; p | let x = m_1(m_2,...); p | if (m_1) { p_1 } else { p_2 }
 *
 * TODO(rachit & sam): This doesn't need to be recursive, we can just modify anf.js to do a minimal
 * anf transformation taking termination into consideration.
 */

const t = require('babel-types');
const h = require('./helpers.js');

const visitor = {};

// stratifyExpression takes an Expression node, a continuation, and a path argument.
//
// It returns a pair of a _must_ terminate expression and a list of statements. These statements
// are potential variable declarations that must be prepended to the expression's parent statement,
// which is inaccessible via `path` in this recursive implementation.
function stratifyExpression(e, k, path) {
  if (t.isIdentifier(e)) {
    return [k(e), []];
  } else if (t.isLiteral(e)) {
    return [k(e), []];
  } else if (t.isBinaryExpression(e)) {
    let pres = [];
    const [exp, presLeft] = stratifyExpression(e.left,
        (leftResult) => {
          const [expRight, presRight] = stratifyExpression(e.right,
                rightResult => k(t.binaryExpression(e.operator,
                    leftResult,
                    rightResult)), path);
          pres = pres.concat(presRight);
          return expRight;
        }, path);
    return [exp, pres.concat(presLeft)];
  } else if (t.isLogicalExpression(e)) {
    let pres = [];
    const [exp, presLeft] = stratifyExpression(e.left,
        (leftResult) => {
          const [expRight, presRight] = stratifyExpression(e.right,
                rightResult => k(t.logicalExpression(e.operator,
                    leftResult,
                    rightResult)), path);
          pres = pres.concat(presRight);
          return expRight;
        }, path);
    return [exp, pres.concat(presLeft)];
  } else if (t.isFunctionExpression(e)) {
    const body = stratifyStatement(e.body, x => x, path);
    return [k(t.functionExpression(e.id, e.params,
        t.blockStatement(body))), []];
  } else if (t.isCallExpression(e)) {
    // callExpressions need to bind their result to a variableDeclaration.
    let pres = [];
    const [exp, presCallee] = stratifyExpression(e.callee,
        (func) => {
          // generate an identifier to which to bind the result of the application
          const tmp = path.scope.generateUidIdentifier('r');
          const presArgs = [];
          const args = e.arguments.map((arg) => {
            const [expArg, pre] = stratifyExpression(arg, x => x, path);
            pres = presArgs.concat(pre);
            return expArg;
          });
          const c = t.callExpression(func, args);
          const v = h.letExpression(tmp, c);
          // concat the new variableDeclaration to our accumulating list of decls to return to the
          // top-level.
          pres = pres.concat(presArgs);
          pres = pres.concat(v);
          return k(tmp);
        }, path);
    return [exp, pres.concat(presCallee)];
  }

  return [k(e), []];
}

// stratifyStatement takes a statement, continuation, and path as arguments.
//
// It returns an array of stratified statements, including any new variable declarations required
// to stratify the statement argument.
function stratifyStatement(statement, k, path) {
  if (t.isExpressionStatement(statement)) {
    const [exp, pres] = stratifyExpression(statement.expression, k, path);
    return pres.concat([t.expressionStatement(exp)]);
  } else if (t.isBlockStatement(statement)) {
    return [t.blockStatement(h.flatten(statement.body.map(x => stratifyStatement(x, k, path))))];
  } else if (t.isReturnStatement(statement)) {
    const [exp, pres] = stratifyExpression(statement.argument, k, path);
    return pres.concat([t.returnStatement(exp)]);
  } else if (t.isVariableDeclaration(statement)) {
    let pres = [];
    const x = [t.variableDeclaration(statement.kind,
        statement.declarations.map((decl) => {
          const [exp, pre] = stratifyExpression(decl.init, k, path);
          pres = pres.concat(pre);
          return t.variableDeclarator(decl.id, exp);
        }))];
    return pres.concat(x);
  }

  return [statement];
}

visitor.Program = function (path) {
  const node = path.node;
  const { body } = node;

  function mapStratify(s) {
    return stratifyStatement(s, x => x, path);
  }

  // map over each statement in our program. stratifying each statement produces an array of
  // statements, so we need to flatten this array of arrays of statements.
  const stratifyBody = h.flatten(body.map(mapStratify));
  // replace the program body with the stratified body.
  node.body = stratifyBody;
};

module.exports = function transform(babel) {
  return { visitor };
};

