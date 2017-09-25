import * as path from 'path';
import * as runtime from './runtime/default';

export function encodeArgs(args: string[]) {
  const opts = runtime.parseRuntimeOpts(args);
  opts.filename = 'file://' + path.resolve('.', opts.filename);
  const ret = 'file://' + path.resolve(__dirname, '../../html/benchmark.html') +
    '#' + encodeURIComponent(JSON.stringify(opts));
  console.log(ret)
  return ret;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(encodeArgs(args));
}
