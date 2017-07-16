import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';

  
function boxVars(path: NodePath<t.Node>, vars: string[]) {
  const visit: Visitor = {
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (path.node.id.type !== "Identifier") {
        throw "unsupported";
      }
      if (vars.includes(path.node.id.name)) {
        path.node.init = t.arrayExpression([path.node.init]);
      }
    },
    Identifier(path: NodePath<t.Identifier>) {
      if (path.parent.type === "VariableDeclarator") {
        path.skip();
        return;
      }
      if (vars.includes(path.node.name)) {
        path.replaceWith(t.memberExpression(path.node, t.numericLiteral(0), true));
        path.skip();
      }
    },
    Function(path: NodePath<t.Function>) {
      const vars0 = vars.filter(x => !path.scope.hasOwnBinding(x));
      path.skip();
      const binds = path.scope.bindings;
      const vars1 = Object.keys(binds).filter(x => !binds[x].constant);
      boxVars(path, [...vars0, ...vars1]);
    }
  }

  path.traverse(visit);
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    const binds = path.scope.bindings;
    const vars = Object.keys(binds).filter(x => !binds[x].constant);
    boxVars(path, vars);
  }  

}

module.exports = function() {
  return { visitor };
}

function main() {
  const filename = process.argv[2];
  const opts = { plugins: [() => ({ visitor })], babelrc: false };
  babel.transformFile(filename, opts, (err, result) => {
    if (err !== null) {
      throw err;
    }
    console.log(result.code);
  });
}

if (require.main === module) {
  main();
}
