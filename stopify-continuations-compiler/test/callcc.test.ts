import * as assert from 'assert';
const glob = require('glob');
import * as t from 'babel-types';
import * as fs from 'fs';
import * as tmp from 'tmp';
import { spawnSync } from 'child_process';
import * as continuationRTS from 'stopify-continuations/dist/runtime/runtime';
import { compile } from '../src/index';

// The compiler produces code that expects Stopify and its runtime compiler to
// be a global variable.
(global as any).stopify = continuationRTS;

function compileForTest(code: string): { globals: any, code: string } {
    let globals = {
        callCC: function(f: any) {
            return continuationRTS.newRTS('lazy').captureCC(k =>
                f((x: any) => k({ type: 'normal', value: x })));
        },
        assert: assert
    };
    let compiled = compile(code, t.identifier('globals')).unwrap();
    return { globals: globals, code: compiled };
}

test('escape continuations', () => {
    let { code, globals } = compileForTest(`
        function f() {
          return callCC(function(k) {
              return k(100);
              throw 23;
              return 5;
          });
        }
        result = f();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({ result: 100 });
});

test('resume continuation three times', () => {
    let { code, globals } = compileForTest(`
        let saved = false;
        let i = 0;
        function myFun() {
            return callCC(function(k) {
                if (saved === false) {
                    saved = k;
                    return k("first");
                };
            });
        }

        function myGun() {
            let r = myFun();
            i++;
            switch (r) {
                case "first": return saved("second");
                case "second": return saved("third");
                case "third": return "done";
                default: throw "Very bad";
            }
        }
        result = myGun();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({ result: 'done', i: 3 });
});

test('nested function state', () => {
    let { code, globals } = compileForTest(`
        function f() {
            function g() { return h() };
            function h() { throw 'original h called'; };
            callCC(function(k) { k(42); });
            h = function() { return 100; }
            return g();
        }
        result = f();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({ result: 100 });
});

test('nested bindings', () => {
    // TODO(arjun): I don't see the point of g being a function.
    let { code, globals } = compileForTest(`
        function f() {
            function g() {}
            {
                callCC(function(k) { k(); });
                g.x = 200;
            }
            callCC(function(k) { k(); });
            return g.x;
        }
        result = f();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({ result: 200 });
});

test('function object state should be preserved when continuation is resumed', () => {
    let { code, globals } = compileForTest(`
        function f() {
            function g() { };
            g.x = 200;
            callCC(function(k) { return k(); });
            return g.x;
        }
        result = f();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({ result: 200 });
});

test('global state is not reset', () => {
    let { code, globals } = compileForTest(`
        let i = [];
        function F() {
            callCC(function(k) {
                i.push(10);
                k();
            });
        }
        F();
    `);

    console.log(code);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({
        i: 1,
    });
});


test('fringe generator rest', () => {
    // This is a tree generator, built with continuations. It marks visited
    // nodes so that we don't visit more than necessary.
    let { code, globals } = compileForTest(`
        function node(left, right) {
            return { left: left, right: right, type: "node", visited: false };
        }

        function leaf(val) {
            return { type: "leaf", val: val, visited: false };
        }

        function treeLeafGen(tree) {
            let caller = "nothing yet";
            let resume = function() {
                returnLeaf(tree);
                return caller("done");
            };

            let returnLeaf = function(tree) {
                tree.visited = false;
                if (tree.type === "leaf") {
                    return callCC(function(remainingLeaves) {
                        resume = function() { remainingLeaves(void 0); };
                        caller(tree.val);
                    });
                }
                else {
                    returnLeaf(tree.left);
                    returnLeaf(tree.right);
                }
            };

            return function() {
                return callCC(function(k) {
                    caller = k;
                    resume();
                });
            };
        }

        let tree0 = leaf(3);
        let tree1 = node(leaf(1), node(leaf(2), tree3));
        let tree2 = node(leaf(10), node(leaf(20), leaf(30)));
        let gen1 = treeLeafGen(tree1);
        let gen2 = treeLeafGen(tree2);
        let r1 = gen1();
        let r2 = gen2();
        let r3 =  gen1();
    `);
    expect(eval(code)).toMatchObject({ type: 'normal' });
    expect(globals).toMatchObject({
        r1: 1,
        r2: 10,
        r3: 2,
        tree0: { visited: false }
     });
});

test

test.skip('resume with an exception', () => {
    // TODO(arjun): We do not have the right API to resume with an exception.

    // /**
    //  * This tests restarting a captured continuation by throwing a value.
    //  */
    // var assert = require('assert');

    // function restartWithExn() {
    // try {
    //     f();
    // }
    // catch(e) {
    //     return e;
    // }
    // }

    // function f() {
    // return captureCC(function(k) {
    //     return g(k);
    // });
    // }

    // // `k` is a function returned by `makeCont` in the Runtime class.
    // // k : (v: any, err?: any) => any
    // function g(k) {
    // return k(null, "throw-this");
    // }

    // var result = restartWithExn();

    // console.log("Result of restart:", result);

    // assert(result == "throw-this");
});