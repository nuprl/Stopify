/**
 * This script is meant to be run on our "cluster" of dedicated servers,
 * virtual machines, and desktops.
 *
 * 1. Create a working directory to store results.
 *
 * 2. Within the working directory, create a file called 'sshloginfile' that
 *    specifies  which machines to use (see GNU Parallel to learn more about
 *    sshloginfiles). Here is an example that uses half the processors on
 *    kate, william, and Arjun's desktop:
 *
 *        4/10.200.0.9
 *        6/10.200.0.6
 *        2/10.9.0.100
 *
 *    You must be able to SSH into these machines without a password.
 *
 * 3. Run the command 'node ./built/src/benchmarking --wd=DIR' where DIR is
 *    the working directory created in Step 1.
 *
 * This produces the file DIR/results.csv, which has the raw data.
 *
 */

import { sprintf } from 'sprintf';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { spawnSync, execSync } from 'child_process';
import * as minimist from 'minimist';
import * as os from 'os';
import * as which from 'which';
import * as g from './generic';
import * as process from 'process';

const nodeBin = which.sync("node");

const stdout = process.stdout;
const stderr = process.stderr;

const opts = minimist(process.argv.slice(2));

/**
 * Creates a working directory for this run, specialized for Swarm.
 * (No longer in use.)
 */
function createWorkingDirectory(): string {
  const now = new Date();
  const user = process.env.USER;
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const h = now.getHours();
  const min = now.getMinutes();
  const date = sprintf('%d-%02d-%02dT%02d_%02d', y, m, d, h, min);
  const dirName = `/mnt/nfs/work1/arjun/${user}/${date}`;
  fs.mkdirSync(dirName);
  return dirName;
}

/**
 * Simple wrapper around child_process.execSync. We need to use 'bash'
 * and not 'sh' for directory comprehensions (or whatever they are called).
 */
function exec(cmd: string) {
  return execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
}

/** Executes thunk only if path does not exist. */
function creates(path: string, thunk: (path: string) => void): void {
  if (fs.existsSync(path)) {
    return;
  }
  thunk(path);
}

function main() {
  const wd = opts.wd;

  const src: string = opts.src ||
    "benchmarks/{clojurescript,python_pyjs,dart_dart2js,scala,ocaml,racket_racketscript}/js-build/*";
  const platform: string = opts.platform || "chrome firefox";
  const transform: string = opts.transform || "original lazy";
  const variance: boolean = opts.variance;
  const estimator: string = opts.estimator || 'reservoir/100';
  const newMethod: string = 'direct wrapper';

  if (transform.split(" ").includes("original") === false) {
    throw new Error("--transform must include original");
  }

  let sshloginfile = path.resolve(wd, 'sshloginfile');
  if ((fs.existsSync(sshloginfile) &&
       fs.statSync(sshloginfile).isFile()) === true) {
    sshloginfile = `--sshloginfile ${sshloginfile}`;
  }
  else {
    console.log("No sshloginfile found. Running all benchmarks locally.");
    sshloginfile = "";
  }

  creates(`${wd}/node_modules`,
    p => fs.mkdirSync(p));
  creates(`${wd}/node_modules/Stopify`,
    p => fs.symlinkSync(path.resolve('.'), p));

  exec(`parallel --progress ${sshloginfile} \
    cd $PWD '&&' ${nodeBin} ./built/src/benchmarking --mode=compile --wd=${wd}  \
    --src={1} --transform={2} --new={3} ::: ${src} ::: ${transform} ::: ${newMethod}`);

  exec(`parallel --progress ${sshloginfile} \
    cd $PWD '&&' ${nodeBin} ./built/src/benchmarking --mode=run --wd=${wd} \
      --src={1} --platform={2} --variance=${variance} \
      --estimator={3} \
      ::: ${wd}/*.js ::: ${platform} ::: ${estimator}`);

  csv();
}


type byPlatformResult = {
  cmd: string,
  src: string
}

function byPlatform(platform: string, src: string): byPlatformResult {
  const re = /^(.*)\.(?:js|html)$/;
  const match = re.exec(src);
  if (match === null) {
    throw new Error(`Expected .js or .html file`);
  }

  switch (platform) {
    case 'node':
      return { cmd: './bin/run', src: match[1] + '.js' };
    case 'chrome':
      return { cmd: './bin/browser', src: match[1] + '.html' };
    case 'firefox':
      return { cmd: './bin/browser', src: match[1] + '.html' };
    default:
      throw new Error(`bad platform ${platform}`)
  }
}

function run() {
  const platform: string = opts.platform;
  const variance = opts.variance;
  const { cmd, src } = byPlatform(platform, opts.src);
  const estimatorRe = /^(reservoir|exact|countdown)(?:\/(\d+))?(?:\/(\d+))?$/;
  const matchEstimator = estimatorRe.exec(opts.estimator);
  if (matchEstimator === null) {
    throw new Error(`could not parse --estimator=${opts.estimator}`);
  }
  let estimator: string = matchEstimator[1];
  let yieldInterval: number = Number(matchEstimator[2]);
  let timePerElapsed: number =  Number(matchEstimator[3]);

  // Parse the filename into transform-newMethod-language-benchmark
  const re = /^([^-]*)-([^-]*)-([^-]*)-(.*)\.(?:js|html)$/;
  const match =  re.exec(path.basename(src));
  if (match === null) {
    throw new Error(`Could not parse filename ${src}`);
  }
  const transform = match[1]
  const newMethod = match[2];
  const language = match[3];
  const benchmark = match[4];

  // If the transform is 'original', reset all transformation parameters to
  // trivial values. This also ensures that original only runs once.
  if (transform === 'original') {
    yieldInterval = NaN;
    timePerElapsed = NaN;
    estimator = "countdown";
  }

  if (platform === 'chrome' && newMethod === 'direct') {
    return;
  }
  if (platform === 'firefox' && newMethod === 'wrapper') {
    return;
  }

  const dst = `${opts.wd}/${benchmark}.${language}.${platform}.${transform}.${yieldInterval},${estimator}.${yieldInterval}.${timePerElapsed}.done`;

  creates(dst, () => {
    const args = [
      "--estimator", estimator,
      "--env", platform
    ];

    if (isNaN(yieldInterval) === false) {
      args.push("--yield", String(yieldInterval));
    }
    if (isNaN(timePerElapsed) === false) {
      args.push('--time-per-elapsed', String(timePerElapsed));
    }

    if (variance) {
      args.push("--variance");
    }

    args.push(src);

    let proc = spawnSync(cmd, args,
      { stdio: [ 'none', 'inherit', 'pipe' ], timeout: 5 * 60 * 1000 });

    const stdoutStr = String(proc.stdout);

    if (proc.status !== 0) {
      console.log(`Error running ${args} ${stdoutStr}`);
      return;
    }

    const spec = `${src},${os.hostname()},${platform},${benchmark},${language},${transform},${estimator},${yieldInterval},${timePerElapsed}\n`;

    fs.writeFileSync(dst, stdoutStr + spec);
  });

}

function compile() {
  const wd = opts.wd;
  const src = opts.src;
  const base = path.basename(src).split('.')[0]; // assumes no further '.'
  const language = path.basename(path.dirname(path.dirname(src)));
  const transform = opts.transform;
  const newMethod = opts.new;
  const compileFd = fs.openSync(`${wd}/compile.csv`, 'w')
  const codeSizeFd = fs.openSync(`${wd}/code-size.csv`, 'w')

  const dstJs = `${wd}/${transform}-${newMethod}-${language}-${base}.js`;
  const dstHtml = `${wd}/${transform}-${newMethod}-${language}-${base}.html`;

  const olen = fs.readFileSync(src).toString().length

  const stime = process.hrtime()
  creates(dstJs, () =>
    exec(`./bin/compile --transform ${transform} --new ${newMethod} ${src} ${dstJs}`));
  const time = process.hrtime(stime)
  const ctime = (time[0] + 1e-9 * time[1]).toString().slice(0, 4)
  const flen = fs.readFileSync(dstJs).toString().length
  const blowup = (flen * 1.0)/(olen * 1.0)

  fs.appendFileSync(<any>compileFd,
    `${transform},${newMethod},${language},${base},${ctime}\n`)
  fs.appendFileSync(<any>codeSizeFd,
    `${transform},${newMethod},${language},${base},${blowup}\n`)

  creates(dstHtml, () =>
    exec(`./bin/webpack ${dstJs} ${dstHtml}`));

  fs.closeSync(compileFd)
  fs.closeSync(codeSizeFd)
}

function csv() {
  const wd = opts.wd;
  const outFiles = fs.readdirSync(wd).filter(path => path.endsWith('.done'));
  const timingFd = fs.openSync(`${wd}/timing.csv`, 'w');
  const varianceFd = fs.openSync(`${wd}/variance.csv`, 'w');

  fs.appendFileSync(<any>timingFd,
    'Path,Hostname,Platform,Benchmark,Language,Transform,Estimator,YieldInterval,TimePerElapsed,RunningTime,NumYields,AvgLatency,VarLatency\n');
  fs.appendFileSync(<any>varianceFd,
    'Path,Hostname,Platform,Benchmark,Language,Transform,Estimator,YieldInterval,TimePerElapsed,Index,Variance\n');

  for (const outFile of outFiles) {
    let lines = fs.readFileSync(`${wd}/${outFile}`, 'utf-8').split('\n');
    lines = g.dropWhile(line => line !== "BEGIN STOPIFY BENCHMARK RESULTS",
                        lines);
    if (lines.length < 3) {
      console.log(`Error reading ${outFile}`);
      continue;
    }
    const factors = lines[lines.length - 2];
    const timing = lines[lines.length - 3];
    let variance =
      g.takeWhile(line => line !== "END VARIANCE",
        g.dropWhile(line => line !== "BEGIN VARIANCE", lines));
    if (variance.length > 0) {
      variance = variance.slice(1); // Drop the BEGIN VARIANCE
    }
    fs.appendFileSync(<any>timingFd, `${factors},${timing}\n`);
    for (const v of variance) {
      fs.appendFileSync(<any>varianceFd, `${factors},${v}\n`);
    }
  }

  fs.closeSync(timingFd);
  fs.closeSync(varianceFd);
  console.log(`Created ${wd}/timing.csv and ${wd}/variance.csv.`);
}

if (opts.mode === 'main' || typeof opts.mode === 'undefined') {
  main();
}
else if (opts.mode === 'compile') {
  compile();
}
else if (opts.mode === 'run') {
  run();
}
else if (opts.mode === 'csv') {
  csv();
}
else {
  throw new Error(`Invalid mode on command line (${opts.mode})`);
}




