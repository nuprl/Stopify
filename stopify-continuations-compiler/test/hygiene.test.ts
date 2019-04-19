import * as babel from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { hygiene, fastFreshId } from '@stopify/normalize-js';
import * as parser from '@babel/parser';

const assert = require('assert');

interface Args {
  reserved: Set<string>
}

const visitor = {
  BindingIdentifier({ node: { name } }: NodePath<t.Identifier>,
                    { reserved }: Args) {
    if (reserved.has(name)) {
      assert.fail(`${name} was not renamed`);
    }
  },
  ReferencedIdentifier({ node: { name } }: NodePath<t.Identifier>,
                    { reserved }: Args) {
    if (reserved.has(name)) {
      assert.fail(`${name} was not renamed`);
    }
  }
} as babel.Visitor;

const initVisitor = {
  Program(path: NodePath<t.Program>) {
    fastFreshId.init(path);
  }
};

function check(src: string, ...reserved: string[]) {
  let ast = parser.parse(src);
  babel.traverse(ast, initVisitor);
babel.traverse(ast, hygiene, undefined as any, { reserved });
  babel.traverse(ast, visitor, undefined, { reserved: new Set(reserved) });
  fastFreshId.cleanup();
}

describe("Testing hygiene visitor", function() {
  it("function argument", () => {
    check(`function f(target, x) { return target; }`, "target");
  });

  it("function name", () => {
    check(`function f(x) { return f; }`, "f");
  });

  it("local bound variable", () => {
    check(`function g(x) { var f; return f; }`, "f");
  });

});
