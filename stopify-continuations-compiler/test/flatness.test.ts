import * as h from '../src/helpers';
import { markFlatFunctions } from '../src/compiler/markFlatFunctions'
import { markFlatApplications } from '../src/compiler/markFlatApplications'
import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';

/**
 * The tests only make sure that nodes are correctly marked as 'flat' and
 * 'not-flat'. They do not check anything regarding the nodes being transformed
 * correctly.
 */

const assert = require('assert');

interface FlatMap {
  mapping: Map<string, h.FlatTag>
}

const visitor = {
  FunctionDeclaration(path: NodePath<t.FunctionDeclaration>,
                      { mapping }: FlatMap) {
    const { node } = path
    assert.equal((<any>node).mark, mapping.get(node.id.name))
  },
  FunctionExpression(path: NodePath<t.FunctionExpression>, { mapping }: FlatMap) {
    if (!path.node.id) {
      assert.fail(`Tests cannot handle nameless function expressions`)
    } else {
      const { node } = path
      assert.equal((<any>node).mark, mapping.get(node.id.name))
    }
  },
  CallExpression(path: NodePath<t.CallExpression>, { mapping }: FlatMap) {
    if(t.isIdentifier(path.node.callee)) {
      const name = path.node.callee.name
      assert.equal((<any>path.node).mark, mapping.get(name), `${name}`)
    }
  }
}

function check(src: string, ...mapping: [string, h.FlatTag][]) {
  let { ast } = babel.transform(src, {
    babelrc: false,
    plugins: [[markFlatFunctions]]
  })

  babel.transformFromAst(ast!, undefined, {
    babelrc: false,
    plugins: [[markFlatApplications]]
  })

  const state = { mapping: new Map(mapping) }

  babel.traverse(ast!, visitor, undefined, state)
}

describe('Testing function flatness', function() {
  it('flat function', function() {
    check(`function f() { return 1 }`, ['f', 'Flat'])
  });

  it('flat function expression', function() {
    check(`(function foo() { return 1})(1)`, ['foo', 'Flat'])
  });

  it('not flat function -- loop', function() {
    check(`function f() { while(true) {} }`, ['f', 'NotFlat'])
  });

  it('not flat function -- call', function() {
    check(`function f() { let app = foo(); }`, ['f', 'NotFlat'],
      ['foo', 'NotFlat'])
  });
});

describe('Testing Application flatness', function() {
  it('Simple flat function call', function() {
    check(`function foo() { return 1 };\n function g() { foo() }`,
      ['foo', 'Flat'], ['g', 'NotFlat'])
  });
});
