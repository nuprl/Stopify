import * as h from '../src/helpers';
import * as markFlatFunctions from '../src/compiler/markFlatFunctions';
import * as markFlatApplications from '../src/compiler/markFlatApplications';
import * as babel from '@babel/core';
import { Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import * as parser from '@babel/parser';

/**
 * The tests only make sure that nodes are correctly marked as 'flat' and
 * 'not-flat'. They do not check anything regarding the nodes being transformed
 * correctly.
 */

const assert = require('assert');

interface FlatMap {
  mapping: Map<string, h.FlatTag>
}

const visitor: Visitor<FlatMap> = {
  FunctionDeclaration(path, { mapping }) {
    const { node } = path;
    assert.equal((<any>node).mark, mapping.get(node.id!.name));
  },
  FunctionExpression(path, { mapping }) {
    if (!path.node.id) {
      assert.fail(`Tests cannot handle nameless function expressions`)
    } else {
      const { node } = path;
      assert.equal((<any>node).mark, mapping.get(node.id!.name));
    }
  },
  CallExpression(path, { mapping }) {
    if(t.isIdentifier(path.node.callee)) {
      const name = path.node.callee.name;
      assert.equal((<any>path.node).mark, mapping.get(name), `${name}`);
    }
  }
};

function check(src: string, ...mapping: [string, h.FlatTag][]) {
  let ast = parser.parse(src);
  babel.traverse(ast, markFlatFunctions.visitor as any);
  babel.traverse(ast, markFlatApplications.visitor as any);
  babel.traverse(ast, visitor, undefined as any, { mapping: new Map(mapping) });
}

describe('Testing function flatness', function() {
  it('flat function', function() {
    check(`function f() { return 1 }`, ['f', 'Flat']);
  });

  it('flat function expression', function() {
    check(`(function foo() { return 1})(1)`, ['foo', 'Flat']);
  });

  it('not flat function -- loop', function() {
    check(`function f() { while(true) {} }`, ['f', 'NotFlat']);
  });

  it('not flat function -- call', function() {
    check(`function f() { let app = foo(); }`, ['f', 'NotFlat'],
      ['foo', 'NotFlat']);
  });
});

describe('Testing Application flatness', function() {
  it('Simple flat function call', function() {
    check(`function foo() { return 1 };\n function g() { foo() }`,
      ['foo', 'Flat'], ['g', 'NotFlat'])
  });
});
