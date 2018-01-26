#!/usr/bin/env node
const browserLine = require('../dist/src/browserLine');
const url = browserLine.localBenchmarkUrl(process.argv.slice(2));
console.log(`Visit the following URL in a browser:\n\n${url}`);