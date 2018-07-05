import * as commander from 'commander';
import { RuntimeOpts } from './types';
import { checkAndFillRuntimeOpts } from './runtime/check-runtime-opts';

commander.option(
  '-y, --yield <interval>',
  'time (in milliseconds) between yields to the event loop (default: 100)');

commander.option(
  '-e, --env <env>',
  'the runtime environment for testing (default: node)');

commander.option(
  '--variance',
  'measure time elapsed between each yield (default: false)');

commander.option(
  '--time-per-elapsed <interval>',
  `an estimate of the time that elapses between calls to the internal suspend \
function (default: 1)`);

commander.option(
  '-r, --resample-interval <interval>',
  `interval between resamples. Only valid with --estimator=velocity. Default: \
same as -y if -y is specified, otherwise 100.`);

commander.option(
  '--stop <duration>',
  'the time after which the program should be terminated (default: never stop)');

commander.option(
  '--estimator <estimator>',
  `one of exact, reservoir, velocity, interrupt, or countdown (default: velocity)`);

commander.option(
  '--stack-size <size>',
  'Maximum number of stack frames allowed in the runtime stack. Ignored if the runtime does not support deep stacks (default: Infinity)');

commander.option(
  '--restore-frames <size>',
  'Number of frames to be restored onto the JS stack after a stack save. A constant implies deep stacks. Infinity implies shallow stacks. (default: Infinity)');

commander.option('--remote <url>',
  'URL of a remote WebDriver server (usually http://<hostname>:4444/wd/hub)');

commander.option('--local-host <hostname>',
  'The host name of this host (default: localhost)',
  x => x,
  'localhost');

commander.option('--local-port <port>',
  'the port to use on this host (default: OS chooses)');

commander.arguments('<filename>');


export function parseRuntimeOpts(rawArgs: string[]): RuntimeOpts {

  const args = commander.parse(["", "", ...rawArgs]);

  let resampleInterval = args.resampleInterval || args.yield;
  if (isNaN(resampleInterval)) {
    resampleInterval = 100;
  }

  return checkAndFillRuntimeOpts({
    filename: args.args[0],
    yieldInterval: args.yield,
    resampleInterval: args.resampleInterval,
    estimator: args.estimator,
    timePerElapsed: args.timePerElapsed,
    stop: args.stop,
    env: args.env,
    variance: args.variance,
    stackSize: args.stackSize,
    restoreFrames: args.restoreFrames
  });
}
