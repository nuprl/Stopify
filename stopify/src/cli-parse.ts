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
    (x) => /^(chrome|firefox|node|safari|MicrosoftEdge|ChromeBook)$/.test(x),
    '--env must be chrome, firefox, safari, MicrosoftEdge, ChromeBook, or node'),
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
  '-r, --resample-interval <interval>',
  `interval between resamples. Only valid with --estimator=velocity. Default: \
same as -y if -y is specified, otherwise 100.`,
  parseArg(parseInt, (x) => x > 0, 'invalid --resample-interval'));

commander.option(
  '--stop <duration>',
  'the time after which the program should be terminated (default: never stop)',
  parseArg(parseInt, (x) => x > 0,
    '--stop expects a positive integer'));

commander.option(
  '--estimator <estimator>',
  `one of exact, reservoir, velocity, or countdown (default: countdown)`,
  parseArg(x => x, x => /^(exact|reservoir|countdown|velocity)$/.test(x),
    'invalid --estimator value'),
  'countdown');

commander.option(
  '-t, --transform <transform>',
  'the transformation used to compile the program',
  parseArg(x => x,
    (x) => /^(eager|retval|lazy|original)$/.test(x),
    'invalid --transform'));

commander.option('--remote <url>',
  'URL of a remote WebDriver server (usually http://<hostname>:4444/wd/hub)');

commander.option('--local-host <hostname>',
  'The host name of this host (default: localhost)',
  x => x,
  'localhost');

commander.option('--local-port <port>',
  'the port to use on this host (default: OS chooses)',
  parseArg(parseInt, (x) => x > 0 && x < 65536, 'bad --local-port'));

commander.arguments('<filename>');


export function parseRuntimeOpts(rawArgs: string[]): Opts {

  const args = commander.parse(["", "", ...rawArgs]);

  const filename = args.args[0];
  if (typeof filename !== 'string') {
    throw new Error(`Missing filename`);
  }

  let resampleInterval = args.resampleInterval || args.yield;
  if (isNaN(resampleInterval)) {
    resampleInterval = 100;
  }

  return {
    transform: args.transform,
    filename: filename,
    yieldInterval: args.yield,
    resampleInterval: args.resampleInterval,
    estimator: args.estimator,
    timePerElapsed: args.timePerElapsed,
    stop: args.stop,
    env: args.env,
    variance: args.variance,
    requireRuntime: false
  };
  return <any>null;
}
