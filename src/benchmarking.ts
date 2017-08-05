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
import { spawnSync, execSync } from 'child_process';
import * as minimist from 'minimist';
import * as os from 'os';

// Will not work with NVM. This is where the Ubuntu node package installs
// itself.
const nodeBin = "/usr/bin/node"

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

  const sshloginfile = path.resolve(wd, 'sshloginfile');
  if ((fs.existsSync(sshloginfile) && 
       fs.statSync(sshloginfile).isFile()) === false) {
    throw new Error(`expected sshloginfile in working directory`);
  }

  const results = `${wd}/results.csv`;

  creates(`${wd}/node_modules`, 
    p => fs.mkdirSync(p));
  creates(`${wd}/node_modules/Stopify`, 
    p => fs.symlinkSync(path.resolve('.'), p));

  exec(`parallel --sshloginfile ${sshloginfile} \
    cd $PWD '&&' ${nodeBin} ./built/src/benchmarking --mode=compile --wd=${wd}  \
    --src={1} ::: benchmarks/scala/js-build/*`);

  if (fs.existsSync(results)) {
    stdout.write(`WARNING: appending to existing results`);
  }
  else {
    fs.writeFileSync(results,
      'Path,Hostname,Platform,Benchmark,Language,Transform,YieldInterval,RunningTime,NumYields\n');
  }

  exec(`parallel --sshloginfile ${sshloginfile} \
    cd $PWD '&&' ${nodeBin} ./built/src/benchmarking --mode=run --wd=${wd} \
      --src={1} --platform={2} --interval={3}  \
      ::: ${wd}/*.js ::: node chrome ::: 0 30000 60000 >> ${results}`);
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
    default:  
      throw new Error(`bad platform ${platform}`)
  }
}

function run() {
  const platform: string = opts.platform;
  const { cmd, src } = byPlatform(platform, opts.src);
  let interval: number = opts.interval;
  // Parse the filename into transform-language-benchmark
  const re = /^([^-]*)-([^-]*)-(.*)\.(?:js|html)$/;
  const match =  re.exec(path.basename(src));
  if (match === null) {
    throw new Error(`Could not parse filename ${src}`);
  }
  const transform = match[1];
  const language = match[2];
  const benchmark = match[3];
  
  // If the transform is 'original', reset all transformation parameters to
  // trivial values. This also ensures that original only runs once.
  if (transform === 'original') {
    interval = 0;
  }

  const dst = `${opts.wd}/${benchmark}.${language}.${platform}.${transform}.${interval}.done`;

  creates(dst, () => {
    const args = ["--yield", `${interval}`, src];
    const proc = spawnSync(cmd, args,
      { stdio: [ 'none', 'inherit', 'pipe' ] });
    const result = proc.status === 0 ? String(proc.stdout) : 'NA,NA,NA\n';
    stdout.write(`${src},${os.hostname()},${platform},${benchmark},${language},${transform},${interval},${result}`);

    if (proc.status === 0) {
      fs.writeFileSync(dst, "");
    }
  });
}

function compile() {
  const wd = opts.wd;
  const src = opts.src;
  const base = path.basename(src).split('.')[0]; // assumes no further '.'
  const language = path.basename(path.dirname(path.dirname(src)));

  function f(transform: string) {
    const dstJs = `${wd}/${transform}-${language}-${base}.js`;
    const dstHtml = `${wd}/${transform}-${language}-${base}.html`;

    creates(dstJs, () =>
      exec(`./bin/compile --transform ${transform} ${src} ${dstJs}`));
    creates(dstHtml, () =>  
      exec(`./bin/webpack ${dstJs} ${dstHtml}`));
  }

  [ 'lazy', 'original' ].forEach(f);
}


if (opts.mode === 'main') {
  main();
}
else if (opts.mode === 'compile') {
  compile();
}
else if (opts.mode === 'run') {
  run();
}
else {
  throw new Error(`Invalid mode on command line (${opts.mode})`);
}




