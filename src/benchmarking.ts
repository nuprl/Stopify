/**
 * Run benchmarking on Swarm.
 */

import { sprintf } from 'sprintf';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, execSync } from 'child_process';
import * as minimist from 'minimist';

const opts = minimist(process.argv.slice(2));

/**
 * Creates a working directory for this run, specialized for Swarm.
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
 * Slurms sets an environment variable SLURM_NODELIST with the names of the
 * nodes that we have. Here are some example values:
 * 
 * swarm[001-020,30]
 * swarm[010-027]
 * swarm002
 * 
 * This function "explodes" SLURM_NODELIST into a comma-separated list
 * of hostnames that is suitable for GNU Parallel.
 * 
 */
function parseSlurmNodelist(): string {
  let nodeList = process.env.SLURM_NODELIST;
  const x = nodeList.indexOf('[');
  if (x === -1) {
    return nodeList;
  }
  const prefix = nodeList.slice(0, x);
  const ranges = nodeList.slice(x + 1, nodeList.length - 1).split(',');
  const nodes = [];
  
  
  for (const range of ranges) {
    const elts = range.split('-');
    if (elts.length === 1) {
      nodes.push(`${prefix}${range}`);
    }
    else {
      const [ loStr, hiStr ] = elts;
      const lo = Number(loStr);
      const hi = Number(hiStr);
      for (let i = lo; i <= hi; i++) {
        const iStr = sprintf('%03d', i);
        nodes.push(`${prefix}${iStr}`);
      }
    }
  }

  return nodes.join(',');
}

/**
 * Simple wrapper around child_process.execSync. We need to use 'bash'
 * and not 'sh' for directory comprehensions (or whatever they are called).
 */
function exec(cmd: string) {
  return execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
}

function execCreates(cmd: string, expected: string) {
  if (fs.existsSync(expected)) {
    return;
  }
  exec(cmd);
}

function main() {
  const wd = opts.wd || createWorkingDirectory();


  const sshloginfile = path.resolve(wd, 'sshloginfile');
  fs.writeFileSync(sshloginfile, parseSlurmNodelist(), 'utf8');

  fs.mkdirSync(`${wd}/node_modules`);
  fs.symlinkSync(path.resolve('.'), `${wd}/node_modules/Stopify`);

  exec(`parallel -j 1 --sshloginfile ${sshloginfile} \
    cd $PWD '&&' node ./built/src/benchmarking --mode=compile --wd=${wd}  \
    --src={1} ::: benchmarks/{scala,python}/js-build/*`);

}

function compile() {
  const wd = opts.wd;
  const src = opts.src;
  const base = path.basename(src).split('.')[0]; // assumes no further '.'
  const language = path.basename(path.dirname(path.dirname(src)));
  const dstJs = `${wd}/${language}-${base}.js`;
  const dstHtml = `${wd}/${language}-${base}.html`;

  execCreates(`node ./built/src/callcc/toModule ${src} > ${dstJs}`, dstJs);
  execCreates(`node ./built/src/webpack/webpack ${dstJs} ${dstHtml}`, dstHtml);
}


if (opts.mode === 'main') {
  main();
}
else if (opts.mode === 'compile') {
  compile();
}
else {
  throw new Error(`Invalid mode on command line (${opts.mode})`);
}




