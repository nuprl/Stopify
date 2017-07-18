import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';

function handleFunction(vars: string[], path: NodePath<t.Function>, body: t.BlockStatement) {
  const vars0 = vars.filter(x => !path.scope.hasOwnBinding(x));
  const binds = path.scope.bindings;
  const vars1 = Object.keys(binds).filter(x => !binds[x].constant);
  path.node.params.forEach(x => {
    if (x.type === "Identifier" && !binds[x.name].constant) {
      const init = t.assignmentExpression("=", x, t.arrayExpression([x]));
      (<any>init).__boxVarsInit__ = true;
      body.body.unshift(t.expressionStatement(init));
    }
  });
  this.oldVars = this.vars;
  this.vars = [...vars0, ...vars1];
}

const visitor: Visitor = {
  Program: {
    enter(path: NodePath<t.Program>) {
      const binds = path.scope.bindings;
      this.vars = Object.keys(binds).filter(x => !binds[x].constant);
    }
  },

  VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
    if (path.node.id.type !== "Identifier") {
      throw "unsupported";
    }
    if (this.vars.includes(path.node.id.name)) {
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
    if (t.isMemberExpression(parent) &&
      parent.property === path.node) {
      path.skip();
      return;
    }
    if (path.parent.type === "VariableDeclarator") {
      path.skip();
      return;
    }
    if (this.vars.includes(path.node.name)) {
      path.replaceWith(t.memberExpression(path.node, t.numericLiteral(0), true));
      path.skip();
    }
  },

  FunctionDeclaration: {
    enter(path: NodePath<t.FunctionDeclaration>): void {
      handleFunction.call(this, this.vars, path, path.node.body);
    },

    exit(path: NodePath<t.FunctionDeclaration>): void {
      this.vars = this.oldVars;
      const f = path.node.id;
      if (this.vars.includes(f.name)) {
        const init = t.assignmentExpression("=", f, t.arrayExpression([f]));
        (<any>init).__boxVarsInit__ = true;
        path.insertAfter(t.expressionStatement(init));
      }
    },
  },

  FunctionExpression: {
    enter(path: NodePath<t.FunctionExpression>): void {
      handleFunction.call(this, this.vars, path, path.node.body);
    },

    exit(path: NodePath<t.FunctionExpression>): void {
      this.vars = this.oldVars;
    },
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
