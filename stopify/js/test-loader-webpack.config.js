module.exports = {
  entry: './dist/src/testing/loader.js',
  output: {
    filename: 'dist/test-loader.bundle.js',
  },
  devtool: 'source-map',
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
