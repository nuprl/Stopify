module.exports = {
  entry: {
    lazy: './dist/src/runtime/lazyRuntime.js',
    eager: './dist/src/runtime/eagerRuntime.js',
    retval: './dist/src/runtime/retvalRuntime.js',
    fudge: './dist/src/runtime/fudgeRuntime.js',
  },
  output: {
    filename: 'dist/stopify-[name].bundle.js',
    library: 'stopifyCont',
    libraryTarget: 'var'
  },
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
