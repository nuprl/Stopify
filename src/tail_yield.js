const t = require('babel-types');
const b = require('babylon');
const h = require('./helpers');

const visitor = {};

function toFuncDecl(str) {
  const func = b.parseExpression(str);
  const { id, params, body, generator } = func;
  return t.functionDeclaration(id, params, body, generator);
}

visitor.Program = {
  exit(path) {
    // Function to run top level callExpressions.
    const runFunc = toFuncDecl(`
    function run(gen) {
      let res = { done: false };
      while (res.done === false) {
        res = gen.next();
      };
      res = res.value;
      return res;
    }
    `);

    const yielder = toFuncDecl(`
    function* yielder() {
      yield 1;
    }
    `);

    path.node.body.unshift(yielder);
    path.node.body.unshift(runFunc);
  },
};

const yieldCall = b.parseExpression(`
  run(yielder())
`);

visitor['FunctionDeclaration|FunctionExpression'] = function (path) {
  // Add a yield call at the top of the function to force it to pause.
  path.node.body.body.unshift(yieldCall);
};

module.exports = function transform(babel) {
  return { visitor };
};
