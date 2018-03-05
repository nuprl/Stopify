const targets = [ ];

for (const transform of [ 'lazy', 'eager', 'retval', 'fudge' ]) {
  targets.push({
    entry: `./dist/src/entrypoints/${transform}.js`,
    output: {
      filename: `dist/stopify-continuations-${transform}.bundle.js`,
      library: 'stopify',
      libraryTarget: 'var'
    }
  });
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