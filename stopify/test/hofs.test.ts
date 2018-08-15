import * as stopify from '../src/entrypoints/compiler';
import * as assert from 'assert';

// The compiler produces code that expects Stopify to be a global variable.
(global as any).stopify = stopify;

const runtimeOpts: Partial<stopify.RuntimeOpts> = {
    yieldInterval: 1,
    estimator: 'countdown'
};

const compilerOpts: Partial<stopify.CompilerOpts> = {
    hofs: 'fill'    
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

test('map', done => {
    const runner = harness(`
        alist = [1,2].map(function(x) { while(false) { }; return x + 1 })`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.alist).toMatchObject([2, 3]);
        done();
    });
});


test('filter', done => {
    const runner = harness(`
        alist = [1,2].filter(function(x) { while(false) { }; return x == 1 })`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.alist).toMatchObject([1]);
        done();
    });
});

