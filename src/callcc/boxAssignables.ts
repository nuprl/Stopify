import * as t from 'babel-types';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';

function box(e: t.Expression): t.ObjectExpression {
  return t.objectExpression([t.objectProperty(t.identifier('box'),
    e === null || e === undefined ?
    t.unaryExpression('void', t.numericLiteral(0)) : e)]);
}

function unbox(e: t.Expression): t.Expression {
  return t.memberExpression(e, t.identifier('box'));
}

function handleFunction(vars: string[], path: NodePath<t.Function>, body: t.BlockStatement) {
  const vars0 = vars.filter(x => !path.scope.hasOwnBinding(x));
  const binds = path.scope.bindings;
  const vars1 = Object.keys(binds).filter(x => !binds[x].constant);
  path.node.params.forEach(x => {
    if (x.type === "Identifier" && !binds[x.name].constant) {
      const init = t.expressionStatement(t.assignmentExpression("=",
        x, box(x)));
      (<any>init).__boxVarsInit__ = true;
      body.body.unshift(init);
    }
  });
  this.oldVars.push(this.vars);
  this.vars = [...vars0, ...vars1];
}

const visitor: Visitor = {
  Program: {
    enter(path: NodePath<t.Program>) {
      const binds = path.scope.bindings;
      this.vars = Object.keys(binds).filter(x => !binds[x].constant);
      this.oldVars = [];
    }
  },

  VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
    if (path.node.id.type !== "Identifier") {
      throw "unsupported";
    }
    if (this.vars.includes(path.node.id.name)) {
      path.node.init = box(path.node.init);
    }
  },

  ExpressionStatement(path: NodePath<t.ExpressionStatement>) {
    if((<any>path.node).__boxVarsInit__) {
      path.skip();
    }
  },

  Identifier(path: NodePath<t.Identifier>) {
    const parent = path.parent;
    if (parent.type === "FunctionExpression" ||
      parent.type === "FunctionDeclaration" ||
      parent.type === "LabeledStatement" ||
      parent.type === "BreakStatement") {
      path.skip();
      return;
    }
    if (t.isMemberExpression(parent) &&
      parent.property === path.node &&
      !parent.computed) {
      path.skip();
      return;
    }
    if (t.isObjectMember(parent) &&
      parent.key === path.node &&
      !parent.computed) {
      path.skip();
      return;
    }
    if (path.parent.type === "VariableDeclarator") {
      path.skip();
      return;
    }
    if (this.vars.includes(path.node.name)) {
      path.replaceWith(unbox(path.node));
      path.skip();
    }
  },

  FunctionDeclaration: {
    enter(path: NodePath<t.FunctionDeclaration>): void {
      handleFunction.call(this, this.vars, path, path.node.body);
    },

    exit(path: NodePath<t.FunctionDeclaration>): void {
      this.vars = this.oldVars.pop();
      const f = path.node.id;
      if (this.vars.includes(f.name)) {
        const init = t.expressionStatement(t.assignmentExpression("=",
          f, box(f)));
        (<any>init).__boxVarsInit__ = true;
        const functionParent = path.findParent(p =>
          p.isFunctionDeclaration() ||
          p.isFunctionExpression() ||
          p.isProgram()).node;
        if (t.isFunction(functionParent)) {
          (<any>functionParent).body.body.unshift(init);
        } else {
          (<any>functionParent).body.unshift(init);
        }
      }
    },
  },

  FunctionExpression: {
    enter(path: NodePath<t.FunctionExpression>): void {
      handleFunction.call(this, this.vars, path, path.node.body);
    },

    exit(path: NodePath<t.FunctionExpression>): void {
      this.vars = this.oldVars.pop();
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
