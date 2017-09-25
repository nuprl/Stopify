import * as path from 'path';
import * as runtime from './runtime/default';

export function benchmarkUrl(args: string[]) {
  const ret = 'file://' + path.resolve(__dirname, '../../dist/benchmark.html') +
    '#' + encodeArgs(args);
  console.log(ret);
  return ret;
}

export function encodeArgs(args: string[]) {
  const opts = runtime.parseRuntimeOpts(args);
  opts.filename = path.resolve('.', opts.filename);
  return encodeURIComponent(JSON.stringify(opts));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(benchmarkUrl(args));
}
