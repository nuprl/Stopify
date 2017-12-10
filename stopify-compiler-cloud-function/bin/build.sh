#!/bin/bash
set -e
set -x
DIR=`dirname $0`
cd $DIR/..

if [ -L node_modules/stopify ]; then
  unlink node_modules/stopify
fi

rsync -avzd --exclude 'node_modules' --exclude-from '../stopify/.npmignore' ../stopify/ ./node_modules/stopify/
./node_modules/.bin/tsc