/**
 * Runs Webpack for Stopify.
 */
import * as path from 'path';
import * as webpack from 'webpack';

export function pack(srcPath: string, dstPath: string, plugin: any, callback: (err: Error | null) => void): void {

  /**
   * This is required for the stopify module to be browserified properly. If
   * this require is changed into an import, webpack and its 332 transitive
   * dependencies.
   */
  const babelOpts = {
    plugins: [plugin],
    babelrc: false,
    minified: true,
    comments: false,
  };

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

  webpack(webpackConfig, (err: any, stats: any) => {
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
