import * as path from 'path';

export function localBenchmarkUrl(args: string[]) {
  args[0] = 'file://' + path.resolve(args[0]);
  const ret = 'file://' + path.resolve(__dirname, '../../dist/benchmark.html') +
    '#' + encodeURIComponent(JSON.stringify(args));
  return ret;
}

export function benchmarkUrl(args: string[]) {
  return encodeURIComponent(JSON.stringify(args));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  console.log(localBenchmarkUrl(args));
}
