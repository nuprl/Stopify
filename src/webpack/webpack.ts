import * as minimist from 'minimist';
import * as tmp from 'tmp';
import * as path from 'path';
import * as fs from 'fs';
import * as webpack from 'webpack';

tmp.setGracefulCleanup();

const args = minimist(process.argv.slice(2));

if (args._.length !== 2) {
  throw 'Expected two file';
}

const srcModule = path.relative(".", args._[0]);
const dstPage = args._[1];

// Create entry point
const mainJs = tmp.fileSync({ postfix: '.js', dir: '.' });
const stream = fs.createWriteStream(mainJs.name, { fd: mainJs.fd });
stream.write(
  `const loader = require('Stopify/built/src/rts');
   function M() {  require("./${srcModule}"); }
   loader.loadInBrowser(M, "./${srcModule}");`);
stream.close();

const outputJs = tmp.fileSync({ postfix: '.js', dir: '.' });

const webpackConfig = {
  entry: "./" + mainJs.name,
  output: { filename: outputJs.name },
  externals: {
    'Stopify/built/src/rts': 'stopify'
  }
};

webpack(webpackConfig, (err, stats) => {
  if (err) {
      throw err;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    info.errors.map((e: any) => console.error(e));
    throw new Error('Errors during Webpack');
  }  

  const out = fs.openSync(dstPage, 'w');

  const stopifyBundlePath = path.resolve(__dirname, '../../stopify.bundle.js');
  fs.writeSync(out, "<html><body><textarea id='data'></textarea>\n");
  fs.writeSync(out, `<script src="file://${stopifyBundlePath}"></script>`);
  fs.writeSync(out, "<script>\n");
  fs.writeSync(out, fs.readFileSync(outputJs.name, 'utf8'));
  fs.writeSync(out, "\n</script></body></html>\n");
  fs.closeSync(out);

});
