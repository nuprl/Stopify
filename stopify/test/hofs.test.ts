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

test('forEach', done => {
    const runner = harness(`
        var arr = [];
        [1,2].forEach(function(x, i) { while(false) { }; arr[i] = x })`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.arr).toMatchObject([1, 2]);
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


test('reduce with initial value', done => {
    const runner = harness(`
        function f(acc, x) {
            while(false) { };
            return x + acc;
        }
        r = ['a','b','c'].reduce(f, 'd');`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe('cbad');
        done();
    });
});


test('reduce without initial value', done => {
    const runner = harness(`
        function f(x, y) {
            while(false) { };
            return x + y;
        }
        r = [1,2,3].reduce(f);`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(6);
        done();
    });
});

test('reduceRight with initial value', done => {
    const runner = harness(`
        function f(acc, x) {
            while(false) { };
            return x + acc;
        }
        r = ['a','b','c'].reduceRight(f, 'd');`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe('abcd');
        done();
    });
});

test('every', done => {
    const runner = harness(`
        function f(x) {
            while(false) { };
            return x > 0;
        }
        r = [1,2,3].every(f);`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(true);
        done();
    });
},);

test('some', done => {
    const runner = harness(`
        function f(x) {
            while(false) { };
            return x == 3;
        }
        r = [1,2,3].some(f);`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(true);
        done();
    });
});


test('find', done => {
    const runner = harness(`
        function f(x) {
            while(false) { };
            return x %3 === 0;
        }
        r = [5,9,7].find(f);`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(9);
        done();
    });
});

test('findIndex', done => {
    const runner = harness(`
        function f(x) {
            while(false) { };
            return x %3 === 0;
        }
        r = [5,9,7].findIndex(f);`)
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.r).toBe(1);
        done();
    });
});

test('sort', done => {
    const runner = harness(`
        const arr = [1,2,3,5,4];
        arr.sort(function (a,b) {
            while (false) {}
            return a - b;
        });`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.arr).toMatchObject([1,2,3,4,5]);
        done();
    });
});

test('map must produce stopified arrays', done => {
    const runner = harness(`
        function F(x) {
            while(false) { };
            return x + 1;
        }
        alist = [1,2].map(F).map(F)`);
    runner.run(result => {
        expect(result).toMatchObject({ type: 'normal' });
        expect(runner.g.alist).toMatchObject([3, 4]);
        done();
    });
});
