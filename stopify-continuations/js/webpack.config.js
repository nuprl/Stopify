const targets = [ ];

const stopifyContinuations = {
  entry: './dist/src/runtime/runtime.js',
  output: {
    filename: 'dist/stopify-continuations.bundle.js',
    library: 'stopify',
    libraryTarget: 'var'
  },
  node: {
    // Commander has these as dependencies
    'fs': 'empty',
    'child_process': 'empty',
  }
};
targets.push(stopifyContinuations);

for (const transform of [ 'lazy', 'eager', 'retval', 'fudge' ]) {
  targets.push({
    entry: `./dist/tmp/implicitApps.${transform}.js`,
    output: {
      filename: `dist/stopifyImplicitApps.${transform}.bundle.js`,
      library: '$i',
      libraryTarget: 'var'
    }
  });
  targets.push({
    entry: `./dist/tmp/hofs.${transform}.js`,
    output: {
      filename: `dist/stopifyHofs.${transform}.bundle.js`,
      library: '$hof',
      libraryTarget: 'var'
    }
  });
  targets.push({
    entry: `./dist/tmp/gettersSetters.${transform}.js`,
    output: {
      filename: `dist/stopifyGettersSetters.${transform}.bundle.js`,
      library: '$gs',
      libraryTarget: 'var'
    }
  });

}

module.exports = targets;