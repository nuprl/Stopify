import * as fs from 'fs';
import * as assert from 'assert';
import * as fixtures from './testFixtures';
import { harness } from './testFixtures';
import * as types from '../src/types';
import * as stopify from '../src/entrypoints/compiler';

// The compiler produces code that expects Stopify and its runtime compiler to
// be a global variable.
(global as any).stopify = stopify;

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
