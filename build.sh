#!/bin/bash
set -e
set -x

(cd util && yarn run build)
(cd hygiene && yarn run build)
yarn run build:normalize-js
yarn run build:stopify-continuations
yarn run build:stopify-continuations-compiler
yarn run build:stopify-estimators
(cd stopify-higher-order-functions && yarn run build)
yarn run build:stopify