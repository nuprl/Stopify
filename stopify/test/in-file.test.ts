import * as fs from 'fs';
import * as assert from 'assert';
import * as fixtures from './testFixtures';
import { harness } from './testFixtures';
import * as types from '../src/types';

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
    for (let filename of fixtures.intTests) {
        test(`integration: ${filename} lazy-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'lazy',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, { }, done);
        }, 30000);

        test(`integration: ${filename} eager-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'eager',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, { }, done);
        }, 30000);

        test(`integration: ${filename} retval-wrapper`, done => {
            let code = fs.readFileSync(filename, { encoding: 'utf-8' });
            runTest(code, {
                captureMethod: 'retval',
                newMethod: 'wrapper',
                jsArgs: 'full'
            }, { }, done);
        }, 30000);

    }
});

describe('Test cases that require deep stacks',() => {
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
}); 