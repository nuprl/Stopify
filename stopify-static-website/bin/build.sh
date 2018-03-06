#!/bin/bash
set -x
set -e
BROWSERIFY=./node_modules/.bin/browserify

jekyll build # Must run first, or generated .js files get clobbered
./node_modules/.bin/tsc
cp ../manual/manual.pdf dist

$BROWSERIFY -d dist/stopify.js -o dist/stopify.js
$BROWSERIFY -d dist/container.js -o dist/container.js
cp ../stopify/dist/stopify.bundle.js dist/stopify.bundle.js
