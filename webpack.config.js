module.exports = {
  entry: './built/src/index.js',
  output: { 
    filename: 'built/stopify.bundle.js',
    library: 'stopify',
    libraryTarget: 'var'
  },
  node: {
    'fs': 'empty',
    'child_process': 'empty',
    'net': 'empty',
    'module': 'empty'
  }
};
