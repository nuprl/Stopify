#!/bin/bash
set -e
set -x

DIR=`dirname $0`
URL=`jq -r .url $DIR/../config.json`
LANG=$1
SRC=$2

curl -X POST -d @$SRC -H 'Content-Type: text/plain' $URL/$1