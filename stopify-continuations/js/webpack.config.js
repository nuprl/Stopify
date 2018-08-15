/**
 * This configuration is used to bundle the various pre-stopified runtimes.
 *
 * ./bin/build generates a stopified version of the these files. This
 * configuration bundles them together.
 */
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

for (const transform of [ 'lazy', 'catch', 'eager', 'retval', 'fudge' ]) {
  targets.push({
    entry: `./dist/tmp/implicitApps.${transform}.js`,
    output: {
      filename: `dist/stopifyImplicitApps.${transform}.bundle.js`,
      library: '$i',
      libraryTarget: 'var'
    }
  });
  targets.push({
    entry: `./dist/tmp/gettersSetters.js`,
    output: {
      filename: `dist/stopifyGettersSetters.bundle.js`,
      library: '$gs',
      libraryTarget: 'var'
    }
  });

}

module.exports = targets;
