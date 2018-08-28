/**
 * This configuration is used to bundle the various pre-stopified runtimes.
 *
 * ./bin/build generates a stopified version of the these files. This
 * configuration bundles them together.
 */
const targets = [ ];

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
