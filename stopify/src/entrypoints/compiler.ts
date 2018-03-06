// /**
//  * This is the entrypoint for stopify-full.bundle.js. A page that includes
//  * this entrypoint can compile programs in the browser.
//  */
// import { CompilerOpts, Opts, AsyncRun } from '../types';
// import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
// import { AbstractRunner } from '../runtime/abstractRunner';
// import { compile } from '../compiler/compiler';
// // We need to provide these for stopify-continuations
// export * from 'stopify-continuations/dist/src/runtime/runtime';
// export * from 'stopify-continuations/dist/src/runtime/implicitApps';

// let runner : Runner | undefined;

// class Runner extends AbstractRunner {

//   constructor(private code: string, opts: Opts) {
//     super(opts);
//    }

//   run(onDone: () => void,
//     onYield?: () => void,
//     onBreakpoint?: (line: number) => void) {
//     this.runInit(onDone, onYield, onBreakpoint);
//     eval(this.code);
//   }
// }

// /**
//  * Called by the stopified program to get suspend() and other functions.
//  */
// export function init(rts: Runtime): AsyncRun {
//   if (runner === undefined) {
//     throw new Error('stopify not called');
//   }
//   return runner.init(rts);
// }

// /**
//  * Control the execution of a pre-compiled program.
//  *
//  * @param url URL of a pre-compiled program
//  * @param opts runtime settings
//  */
// export function stopifyLocally(src: string, compileOpts: CompilerOpts,
//   runtimeOpts: Opts): AsyncRun {
//   runner = new Runner(compile(src, compileOpts), runtimeOpts);
//   return runner;
// }
