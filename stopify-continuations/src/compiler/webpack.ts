/**
 * Runs Webpack for Stopify.
 */
import * as webpack from 'webpack';
import * as path from 'path';
import * as babel from 'babel-core';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';

export function pack(srcPath: string, dstPath: string, plugin: any, callback: (err: Error | null) => void) {
  const babelOpts = {
    plugins: [plugin],
    babelrc: false,
    minified: true,
    comments: false,
  };

  // const { code: interCode } = babel.transformFileSync(srcPath, babelOpts);
  // console.log(interCode);
  // const interPath = tmp.fileSync({ postfix: '.exclude.js' }).name;
  // fs.writeFileSync(interPath, interCode);


  const webpackConfig = {
    entry: './' + path.relative('.', srcPath),
    output: { filename: path.relative('.', dstPath) },
    module: {
      rules: [ {
        test: /\.js$/,
        // NOTE(arjun): This is a small hack.
        exclude: /(\.exclude\.js$|node_modules\/(?!bs-platform))/,
        loader: 'babel-loader',
        options: babelOpts
      } ]
    },
    node: {
      global: false,
      Buffer: false,
      'fs': 'empty',
      'path': 'empty',
    },
    resolve: {
      modules: [
        path.resolve('node_modules'),
        path.resolve('../node_modules'),
      ],
    }    

  };

  webpack(webpackConfig, (err, stats) => {
    if (err) {
      return callback(err);
    }
    const info = stats.toJson();
    if (stats.hasErrors()) {
      info.errors.map((e: any) => console.error(e));
      return callback(new Error('Errors during Webpack'));
    }
    callback(null);
  });
}