#!/usr/bin/env node  --max_old_space_size=4096
const browserLine = require('../built/src/browserLine');
const url = browserLine.localBenchmarkUrl(process.argv.slice(2));
console.log(`Visit the following URL in a browser:\n\n${url}`);