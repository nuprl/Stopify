import * as fs from 'fs';
import * as stopify from '../src/entrypoints/compiler';
import * as assert from 'assert';
import * as fixtures from './testFixtures.js';
import * as types from '../src/types';

// The compiler produces code that expects Stopify and its runtime compiler to
// be a global variable.
(global as any).stopify = stopify;

function setupGlobals(runner: stopify.AsyncRun & stopify.AsyncEval) {
    var globals: any = {
        assert: assert,
        require: function(str: string) {
            if (str === 'assert') {
                return assert;
            }
            else {
                throw 'unknown library';
            }
        },
        Math: Math,
        Number: Number,
        String: String,
        WeakMap: WeakMap, // TODO(arjun): We rely on this for tests?!
        console: console,
    };
    runner.g = globals;
}

function harness(code: string,
    compilerOpts: Partial<stopify.CompilerOpts> = { },
    runtimeOpts: Partial<stopify.RuntimeOpts> = {
        yieldInterval: 1,
        estimator: 'countdown'
    }) {
    const runner = stopify.stopifyLocally(code, compilerOpts, runtimeOpts);
    if (runner.kind === 'error') {
        throw runner.exception;
    }
    setupGlobals(runner);
    return runner;
}

test('in a function (not method), this should be the global this', done => {
    const runner = harness(`
        var x = this;
        var y;
        function foo() {
            y = this;
        }
        foo();`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.x).toBe(global);
        expect(runner.g.y).toBe(runner.g.x);
        done();
    });
});

test('can refer to arguments', done => {
    const runner = harness(`
        var x = this;
        var y;
        function foo() {
            y = arguments.length;
        }
        foo(1,2,3);`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.y).toBe(3);
        done();
    });
});

test('external HOF', done => {
    const runner = harness(`
        result = 4000 + externalFunction(function(x) { return x + 1; });`);
    // Without Stopify, this function would be:
    // function(f) { return f(20) + 300; }
    runner.g.externalFunction = function(f: any) {
        runner.externalHOF(complete => {
        runner.runStopifiedCode(
            () => f(20),
            (result) => {
            if (result.type === 'normal') {
                complete({ type: 'normal', value: result.value + 300 });
            }
            else {
                complete(result);
            }
            });
        });
    }
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.result).toBe(4321);
        done();
    });
});

// NOTE(arjun): This test can probably be simplified further. The real issue
// is that boxing/unboxing of the argument x gets mixed up, and I don't think
// the externalHOF is needed to trigger it.
test('external HOF with arguments materialization', done => {
    const runner = harness(`
        function check(y) { return y === 900; }

        function oracle(x) {
            arguments.length; // force arguments materialization
            externalFunction(function() { }); // needed
            function escape() { return x; } // force x to be boxed
            r = check(x);
        }
        oracle(900)`);
    // Without Stopify, this function would be:
    // function(f) { return f(20) + 300; }
    runner.g.externalFunction = function(f: any) {
        runner.externalHOF(complete => {
        runner.runStopifiedCode(
            () => f(),
            (result) => {
                if (result.type === 'normal') {
                    complete({ type: 'normal', value: result.value });
                }
                else {
                    complete(result);
                }
            });
        });
    };
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(true);
        done();
    });
});

function runTest(code: string,
    compilerOpts: Partial<types.CompilerOpts>,
    runtimeOpts: Partial<types.RuntimeOpts>,
    onDone: () => void) {
    let runner = harness(code, compilerOpts, runtimeOpts);
    let done = false;
    runner.run(result => {
        if (done) {
            return;
        }
        done = true;
        expect(result).toMatchObject({ type: 'normal' });
        onDone();
    });
    setTimeout(() => {
        if (done) {
            return;
        }
        done = true;
        runner.pause(() => undefined);
        assert(false);
    }, 10000);

}

describe('in-file tests', function() {
    for (let filename of fixtures.unitTests) {
        test(`in-file ${filename} (lazy, wrapper)`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'lazy',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });

        test(`in-file ${filename} (lazy, direct)`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code,  {
                captureMethod: 'lazy',
                newMethod: 'direct',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });

        test(`in-file ${filename} (catch, direct)`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code,  {
                captureMethod: 'catch',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });
    }
});

describe('integration tests', function () {
    for (let filename of fixtures.unitTests) {
        test(`integration: ${filename} lazy-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'lazy',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });

        test(`integration: ${filename} lazy-wrapper-deep-stack`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'lazy',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown',
                stackSize: 1000,
                restoreFrames: 1
            }, done);
        });

        test(`integration: ${filename} retval-wrapper-deep-stack`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'retval',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown',
                stackSize: 1000,
                restoreFrames: 1
            }, done);
        });

        test(`integration: ${filename} eager-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'eager',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });

        test(`integration: ${filename} retval-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'retval',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, {
                yieldInterval: 1,
                estimator: 'countdown'
            }, done);
        });

    }
});