import * as commander from 'commander';
import { Opts } from './types';
import { parseArg } from './generic';

commander.option(
  '-y, --yield <interval>',
  'time between yields to the event loop (default: never yield)',
  parseArg(parseInt, x => x > 0, '--yield requires a number'),
  NaN);

commander.option(
  '-e, --env <env>',
  'the runtime environment (default: node)',
  parseArg(x => x,
    (x) => /^(chrome|firefox|node)$/.test(x),
    '--env must be chrome, firefox, or node'),
  'node');

commander.option(
  '--variance',
  'measure time elapsed between each yield (default: false)');

commander.option(
  '--time-per-elapsed <interval>',
  `an estimate of the time that elapses between calls to the internal suspend \
function (default: 1)`,
   parseArg(parseInt, (x) => x > 0,
    '--time-per-elapsed expects a positive integer'),
   1);

commander.option(
  '--stop <duration>',
  'the time after which the program should be terminated (default: never stop)',
  parseArg(parseInt, (x) => x > 0,
    '--stop expects a positive integer'));

commander.option(
  '--estimator <estimator>',
  `one of exact, reservoir, or countdown (default: countdown)`,
  parseArg(x => x, x => /^(exact|reservoir|countdown)$/.test(x),
    'invalid --estimator value'),
  'countdown');

commander.option(
  '-t, --transform <transform>',
  'the transformation used to compile the program',
  parseArg(x => x,
    (x) => /^(eager|retval|lazy|original)$/.test(x),
    'invalid --transform'));

commander.arguments('<filename>');


export function parseRuntimeOpts(rawArgs: string[]): Opts {

  const args = commander.parse(["", "", ...rawArgs]);

  const filename = args.args[0];
  if (typeof filename !== 'string') {
    throw new Error(`Missing filename`);
  }

  return {
    transform: args.transform,
    filename: filename,
    yieldInterval: args.yield,
    estimator: args.estimator,
    timePerElapsed: args.timePerElapsed,
    stop: args.stop,
    env: args.env,
    variance: args.variance
  };
  return <any>null;
}
