import * as path from 'path';
import * as runtime from './runtime/default';
import * as os from 'os';

const args = process.argv.slice(2);
const opts = runtime.parseRuntimeOpts(args);

function suffixAfter(str: string, key: string) {
  return str.slice(str.indexOf(' ')! + 1);
}

const src = 'file://' + path.resolve('.', opts.filename) +
  '#' + encodeURIComponent(JSON.stringify(args));

console.log(src);
