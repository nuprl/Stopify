import * as fs from 'fs';
import * as stopify from '../src/entrypoints/compiler';
import * as assert from 'assert';
import * as fixtures from './testFixtures.js';
import * as types from '../src/types';
import { harness } from './testFixtures';

// The compiler produces code that expects Stopify and its runtime compiler to
// be a global variable.
(global as any).stopify = stopify;

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

test('external higher-order function', done => {
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

function expectNontermination(code: string,
    compilerOpts: Partial<types.CompilerOpts>,
    onDone: () => void) {
    let timers: NodeJS.Timer[] = [ ];
    function clearTimers() {
        timers.forEach(timerId => clearTimeout(timerId));
    }
    const runtimeOpts: Partial<types.RuntimeOpts> = {
        estimator: 'countdown',
        yieldInterval: 10
    };
    const runner = harness(code, compilerOpts, runtimeOpts);
    runner.run(result => {
        clearTimers();
        assert(false, `program terminated with ${JSON.stringify(result)}`);
    });
    timers.push(setTimeout(() => {
        runner.pause(line => {
            clearTimers();
            onDone();
        });
        timers.push(setTimeout(() => {
            clearTimers();
            assert(false, 'program did not pause');
        }, 5000));
    }, 5000));
}

describe('stopping nonterminating programs', () => {

    test('infinite loop (lazy, nontermination)', onDone => {
        expectNontermination(`while (true) { }`,
            { captureMethod: 'lazy' }, onDone);
    }, 12 * 1000);

    test('infinite loop (eager, nontermination)', onDone => {
        expectNontermination(`while (true) { }`,
            { captureMethod: 'eager' }, onDone);
    }, 12 * 1000);

    test('infinite loop (retval, nontermination)', onDone => {
        expectNontermination(`while (true) { }`,
            { captureMethod: 'retval' }, onDone);
    }, 12 * 1000);

});
