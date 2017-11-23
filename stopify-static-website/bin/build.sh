#!/bin/bash
set -x
set -e
BROWSERIFY=./node_modules/.bin/browserify

./node_modules/.bin/tsc

$BROWSERIFY -d dist/stopify.js -o dist/stopify.js
$BROWSERIFY -d dist/container.js -o dist/container.js
cp ../stopify/dist/stopify.bundle.js dist/stopify.bundle.js
cp www/* dist/
