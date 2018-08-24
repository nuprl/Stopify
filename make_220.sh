#!/bin/bash
yarn install && pushd stopify-estimators && yarn run build && popd && \
  pushd stopify-continuations && yarn run build && yarn link && popd && \
  pushd stopify && yarn run build && yarn link && popd
