import * as stopify from '../src/entrypoints/compiler';
import * as assert from 'assert';

// The compiler produces code that expects Stopify to be a global variable.
(global as any).stopify = stopify;

const runtimeOpts: Partial<stopify.RuntimeOpts> = {
    yieldInterval: 1,
    estimator: 'countdown'
};

const compilerOpts: Partial<stopify.CompilerOpts> = {
    // empty options
};

function setupGlobals(runner: stopify.AsyncRun & stopify.AsyncEval) {
    var globals: any = {
        assert: assert,
        console: console,
    };
    runner.g = globals;
}

function harness(code: string) {
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
        expect(runner.g.x).toBe(runner.g.y);
        done();
    });
});

test('can refer to arguments', done => {
    const runner = harness(`
        var x = this;
        var y;
        function foo() {
            return arguments.length;
        }
        foo(1,2,3);`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.x).toBe(runner.g.y);
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
    }
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(true);
        done();
    });
});