import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import { plugin as stopifyCallCC } from './callcc/stopifyCallCC';
import * as commander from 'commander';
import { parseArg } from './generic';
import * as webpack from 'webpack';
import * as tmp from 'tmp';
import { RawSourceMap } from 'source-map';
import { generateLineMapping, LineMapping } from './common/helpers';

const stderr = process.stderr;

commander.option(
  '-t, --transform <transformation>',
  'either eager, lazy, retval, original, or fudge',
  parseArg(x => x,
    (x) => /^(eager|lazy|retval|original|fudge)$/.test(x),
    'invalid --transform, see --help'),
  'lazy');

commander.option(
  '-n, --new <new>',
  'either direct or wrapper',
  parseArg(x => x, x => /^(direct|wrapper)$/.test(x),
    'invalid --new, see --help'),
  'wrapper');

commander.option(
  '--es <mode>',
  'either sane or es5 (default: sane)',
  parseArg(x => x, x => /^(sane|es5)$/.test(x),
    'invalid --es, see --help'),
  'sane');

commander.option(
  '--webpack',
  '');

commander.option(
  '--debug',
  'Insert suspensions between every line of code in the source program',
  false);

commander.option(
  '--cache <dir>',
  'directory to cache object files',
  parseArg(x => x, x => true,
    'invalid --cache, see help'),
  undefined);

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);
const srcPath = args.args[0];
const dstPath = args.args[1];

let sourceMap;
if (args.debug) {
  const {map} = babel.transformFileSync(srcPath, {
    babelrc: false,
    ast: false,
    code: false,
  });
  sourceMap = generateLineMapping(<RawSourceMap>map);
}
const plugin: any = [
  stopifyCallCC,
  {
    captureMethod: args.transform,
    handleNew: args.new,
    esMode: args.es,
    debug: args.debug,
    sourceMap: sourceMap,
  }
];

if (args.webpack) {
  const srcModule = './' + path.relative(process.cwd(), srcPath);
  const mainJs = tmp.fileSync({ postfix: '.exclude.js', dir: process.cwd() });
  // NOTE(arjun): This is a small hack. By putting the require() in a thunk, we
  // (1) delay loading the program before the RTS and (2) ensure that Webpack
  // can statically resolve the module.
  fs.writeFileSync(mainJs.name,
    `function M() {  require("./${srcModule}"); }
     require('Stopify/built/src/rts').afterScriptLoad(M);`);
  const rules: any[] = []
  if (args.transform !== 'original') {
    rules.push({
      test: /\.js$/,
      // NOTE(arjun): This is a small hack. We don't transform files
      // that end with .exclude.js, such as the loader created above.
      exclude: /(\.exclude\.js$|node_modules)/,
      loader: 'babel-loader',
      options: {
          plugins: [plugin],
          minified: true,
          comments: false,
          cacheDirectory: args.cache
      }
    });
  }
  const webpackConfig = {
    entry: './' + path.relative('.', mainJs.name),
    output: { filename: './' + path.relative('.', dstPath) },
    externals: { 'Stopify/built/src/rts': 'stopify' },
    module: {
      rules: rules
    }
  };

  webpack(webpackConfig, (err, stats) => {
    fs.unlinkSync(mainJs.name);
    if (err) {
        throw err;
    }
    const info = stats.toJson();
    if (stats.hasErrors()) {
      info.errors.map((e: any) => console.error(e));
      throw new Error('Errors during Webpack');
    }
    process.exit(0);
  });
}
else {
  const opts = {
    plugins: [plugin],
    babelrc: false,
    ast: false,
    code: true,
    minified: true,
    comments: false,
  };

  if (args.transform === 'original') {
    const src = fs.readFileSync(srcPath, 'utf8')
    if (dstPath === undefined) {
      console.log(src);
    }
    else {
      fs.writeFileSync(dstPath, src);
    }
    process.exit(0);
  }

  babel.transformFile(srcPath, opts, (err, result) => {
    if (err !== null) {
      throw err;
    }
    const { code } = result;
    if (typeof dstPath === 'undefined') {
      process.stdout.write(code!);
      process.exit(0);
    }
    fs.writeFile(dstPath, code!, (err) => {
      if (err !== null) {
        stderr.write(`error writing result (--dst must be a path)`);
        process.exit(1);
      }
      process.exit(0);
    });
  });
}
