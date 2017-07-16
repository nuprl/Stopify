import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';

function boxVars(path: NodePath<t.Node>, vars: string[]) {
  function handleFunction(path: NodePath<t.Function>, body: t.BlockStatement) {
    const vars0 = vars.filter(x => !path.scope.hasOwnBinding(x));
    path.skip();
    const binds = path.scope.bindings;
    const vars1 = Object.keys(binds).filter(x => !binds[x].constant);
    path.node.params.forEach(x => {
      if (x.type === "Identifier" && !binds[x.name].constant) {
        const init = t.assignmentExpression("=", x, t.arrayExpression([x]));
        (<any>init).__boxVarsInit__ = true;
        body.body.unshift(t.expressionStatement(init));
      }
    });
    boxVars(path, [...vars0, ...vars1]);
  }

  const visit: Visitor = {
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      if (path.node.id.type !== "Identifier") {
        throw "unsupported";
      }
      if (vars.includes(path.node.id.name)) {
        path.node.init = t.arrayExpression([path.node.init]);
      }
    },
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
      if ((<any>path.node).__boxVarsInit__) {
        path.skip();
      }
    },
    Identifier(path: NodePath<t.Identifier>) {
      const parent = path.parent;
      if (parent.type === "FunctionExpression" ||
          parent.type === "FunctionDeclaration") {
        path.skip();
        return;
      }
      if (parent.type === "MemberExpression" &&
          (<any>parent).property === path.node) {
        path.skip();
        return;
      }
      if (path.parent.type === "VariableDeclarator") {
        path.skip();
        return;
      }
      if (vars.includes(path.node.name)) {
        path.replaceWith(t.memberExpression(path.node, t.numericLiteral(0), true));
        path.skip();
      }
    },
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      handleFunction(path, path.node.body);
    },
    FunctionExpression(path: NodePath<t.FunctionExpression>) {
      handleFunction(path, path.node.body);
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
