/**
 * This program returns the local URLs to Stopify's bundles. These URLs
 * can be used as the source of locally hosted <script>s.
 */
const validPaths = [ 'stopify.bundle.js', 'stopify-full.bundle.js' ];

function main() {
  if (process.argv.length !== 3) {
    console.log('expected one argument');
    process.exit(1);
    return;
  }

  const aPath = process.argv[2];
  if (!validPaths.includes(aPath)) {
    console.log('unexpected path');
    process.exit(1);
    return;
  }

  console.log('file://' + require.resolve(`../../${aPath}`));
}

main();