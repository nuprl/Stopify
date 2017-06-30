import * as t from 'babel-types';
import { NodePath } from 'babel-traverse';
import * as h from '../common/helpers';
import * as path from 'path';

let addRuntime = false

// Runtime path
const runtimePath = path.join(__dirname, './stopifyYield')

const prog = {
  exit(path: NodePath<t.Program>) {
    if (addRuntime) {
      const runtimeImport = h.letExpression(
        t.identifier('$compile_string'),
        t.memberExpression(
          t.callExpression(
            t.identifier('require'),
            [t.stringLiteral(runtimePath)]),
          t.identifier('yieldEvalString')))
      path.node.body.unshift(runtimeImport)
    }
  }
}

// Handle `eval` occuring in function calls.
const callExpr = {
  enter(path: NodePath<t.CallExpression>) {
    const { callee, arguments:args } = path.node;
    if(t.isIdentifier(callee) && callee.name === 'eval') {
      if(process) {
        process.stderr.write('// Found eval in code, requiring runtime\n')
      }
      addRuntime = true;
      path.node.arguments = args.map(e =>
        t.callExpression(t.identifier('$compile_string'), [e]))
    }
  }
}

// Handle new Function
const newExpr = {
  enter(path: NodePath<t.NewExpression>) {
    const { callee, arguments:args } = path.node;
    if(t.isIdentifier(callee) && callee.name === 'Function') {
      if(process) {
        process.stderr.write(
          '// Found `new Function` in code, requiring runtime\n')
      }
      addRuntime = true;
      const last = path.node.arguments.pop()
      if (last !== undefined) {
        path.node.arguments.push(t.callExpression(
          t.identifier('$compile_string'),
          [last]))
        path.node.callee = t.identifier('GeneratorPrototype')
      }
    }
  }
}

const visitor = {
  Program: prog,
  CallExpression: callExpr,
  NewExpression: newExpr
}

module.exports = function() {
  return { visitor }
}
