module.exports = {
  entry: './dist/src/testing/pyret-loader.js',
  output: {
    filename: 'dist/pyret-loader.bundle.js',
  },
  devtool: 'source-map',
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
