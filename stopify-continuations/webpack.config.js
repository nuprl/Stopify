module.exports = {
  entry: './dist/src/rts.js',
  output: {
    filename: 'dist/stopify.bundle.js',
    library: 'stopify',
    libraryTarget: 'var'
  },
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
