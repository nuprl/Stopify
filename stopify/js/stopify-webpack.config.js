module.exports = {
  entry: './dist/src/runtime/precompiled.js',
  output: {
    filename: 'dist/stopify.bundle.js',
    library: 'stopify',
    libraryTarget: 'var'
  },
  devtool: 'source-map',
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
