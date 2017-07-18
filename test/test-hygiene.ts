import * as helpers from '../src/common/helpers';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
const assert = require('assert');
import Hygiene from '../src/common/hygiene';

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
};

function check(src: string, ...reserved: string[]) {
  const { ast } = babel.transform(src, {
    babelrc: false,
    plugins: [
      [ Hygiene, { reserved } ]
    ]
  });
  const state = {
    reserved: new Set(reserved)
  };

  babel.traverse(ast!, visitor, undefined, state);
}

describe("Testing hygiene visitor", function() {
  this.timeout(0);

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
