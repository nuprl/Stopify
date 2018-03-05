const runtimeOnly = {
  entry: './dist/src/entrypoints/runtimeOnly.js',
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

const compilerAndRuntime = {
  entry: './dist/src/entrypoints/compiler.js',
  output: {
    filename: 'dist/stopify-full.bundle.js',
    library: 'stopify',
    libraryTarget: 'var'
  },
  devtool: 'source-map',
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
    'net': 'empty',
    'module': 'empty'
  }
};

module.exports = [ runtimeOnly, compilerAndRuntime ];