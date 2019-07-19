#!/bin/bash
set -x
set -e
./node_modules/.bin/tsc -b

mkdir -p dist/stopified

# Build runtime support for higher-order functions, etc.
for TRANSFORM in lazy catch eager retval fudge; do
  ../stopify-continuations-compiler/bin/stopify-continuations.js --compile-mode library -t $TRANSFORM dist/ts/mozillaHofPolyfill.js dist/ts/mozillaHofPolyfill.$TRANSFORM.js
  ../stopify-continuations-compiler/bin/stopify-continuations.js --compile-mode library -t $TRANSFORM dist/ts/simpleHofPolyfill.js dist/ts/simpleHofPolyfill.$TRANSFORM.js

done
