#!/bin/bash

# Make sure that `stopify` and `stopify-modules` are not linked.
yarn unlink stopify stopify-continuations

rm -rf node_modules/{stopify,stopify-continuations}
mkdir -p node_modules/{stopify,stopify-continuations}

cp -R ../stopify/dist node_modules/stopify/dist
cp -R ../stopify-continuations/dist node_modules/stopify-continuations/dist
