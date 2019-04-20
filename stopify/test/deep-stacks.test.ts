// NOTE(arjun): Deep stacks is currently broken. These tests used to wrongly
// succeed. However, the assertion at the end would never execute and the
// program would signal an exception.
import { harness } from './testFixtures';
import * as types from '../src/types';

// The compiler produces code that expects Stopify and its runtime compiler to
// be a global variable.
(global as any).stopify = stopify;

const runtimeOpts: Partial<types.RuntimeOpts> = {
    stackSize: 100,
    restoreFrames: 1,
    estimator: 'countdown',
    yieldInterval: 25
};

test.skip('non-tail recursive function (deep, lazy)', onDone => {
    const runner = harness(`
        function sum(x) {
            if (x <= 1) {
                return 1;
            } else {
                return x + sum(x-1);
            }
        }
        assert.equal(sum(200), 1250025000);
        `, { captureMethod: 'lazy' }, runtimeOpts);
    runner.run(result => {
        expect(result).toEqual({ type: 'normal' });
        onDone();
    });
}, 10000);

test.skip('non-tail recursive function (deep, eager)', onDone => {
    const runner = harness(`
        function sum(x) {
            if (x <= 1) {
                return 1;
            } else {
                return x + sum(x-1);
            }
        }
        assert.equal(sum(200), 1250025000);
        `, { captureMethod: 'eager' }, runtimeOpts);
    runner.run(result => {
        expect(result).toEqual({ type: 'normal' });
        onDone();
    });
}, 10000);

// This test makes sure that an exception thrown from a stack
// frame is properly threaded through a captured stack.
test.skip('deep stacks with exceptions (deep, eager)', onDone => {
    const runner = harness(`
        const assert = require('assert');
        function sumThrow(n) {
            if (n <= 0) {
                throw 0;
            }
            else {
                try {
                    sumThrow(n - 1);
                }
                catch(e) {
                    throw e + n;
                }
            }
        }
        try {
            sumThrow(50000)
        }
        catch(e) {
            assert.equal(e, 1250025000)
        }
        `, { captureMethod: 'eager' }, runtimeOpts);
    runner.run(result => {
        expect(result).toEqual({ type: 'normal' });
        onDone();
    });
}, 10000);
