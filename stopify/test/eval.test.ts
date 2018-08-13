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
    jsArgs: 'full'
};

function setupGlobals(runner: stopify.AsyncRun & stopify.AsyncEval) {
    var globals: any = {
        assert: assert,
        console: console,
        eval: (code: string) => {
            runner.pauseImmediate(() => {
                runner.evalAsync(code, result => {
                    runner.continueImmediate(result);
                });
            });
        }
    };
    runner.g = new Proxy(globals, {
        get: function(o: any, k: any) {
            console.log(`reading ${k}`);
            return globals[k];
        },
        set: function(o: any, k: any, v: any) {
            console.log(`setting ${k} to ${v}`);
            globals[k] = v;
            return true;
        }
    });
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

test('trivial eval 1', done => {
    harness(`let x = 1 + 2; eval('1 + 2')`)
        .run(result => {
            expect(result).toMatchObject({ type: 'normal' });
            done();
        });
});

test('trivial eval 2', done => {
    const runner = harness(`
        let x = 0;
        eval('x++');`);
    runner.run(result => {
            expect(result).toMatchObject({ type: 'normal' });
            expect(runner.g).toMatchObject({ x: 1 });
            done();
    });
});

test('eval a function call', done => {
    harness(`
        let x = 0;
        function foo() {
        x++;
        }

        eval('foo()');
        assert.equal(x, 1);`)
        .run(result => {
            expect(result).toMatchObject({ type: 'normal' });
            done();
        });
});

test('eval where a function calls a function', done => {
    const runner = harness(`
        let x = 0;
        function foo() {
            x++;
        }
        eval('function g() { foo() }; g()');`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ x: 1 });
        done();
    });
});

// This test also requires eval to produce a value
test('An eval with two function calls within it', done => {
    const runner = harness(`
    function unit() {
      while (false) {}
      return 1;
    }

    const two = eval('unit() + unit()');`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ two: 2 });
        done();
    });
});

test('eval with boxes', done => {
    const runner = harness(`
        let x = 7;
        let y = 'hello';
        function foo() {
        let z = 0;
        //  arguments[1] = x;
        eval('function bar() { while (false) {} } bar(); x = 10; y = x');
        {
            let z = 1;
            eval('z = 9')
            assert.equal(z, 1); // NOTE(arjun): Eval works in global scope
        }
        //  assert.equal(arguments[1], 7);
        assert.equal(z, 0);
        }
        foo();`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ x: 10, y: 10 });
        done();
    });
});

test('exception from eval\'d code', done => {
    const runner = harness(`
        var x = 0;
        function foo() {
            while (false) {}
            x = 1;
        }
        function bar() {
            while (false) {}
            x = x + 10;
            throw x;
        }
        try {
            eval('foo(); bar();');
        } catch (e) {
            x = x + 100;
        }`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ x: 111 });
        done();
    });
});

test('eval with suspension at top-level', done => {
    const runner = harness(`
        let x = 0;
        eval('while (++x < 10) {}');`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ x: 10 });
        done();
    });
});

test('eval that declares a global variable', done => {
    const runner = harness(`
        eval('let x = 200;');`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g).toMatchObject({ x: 200 });
        done();
    });
});
