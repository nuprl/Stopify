#!/bin/bash
set -e
set -x

DIR=`dirname $0`
URL=`jq -r .url $DIR/../config.json`
BUCKET=`jq -r '.["output-bucket"]' $DIR/../config.json`
LANG=$1
SRC=$2

OUTFILE=`curl -X POST --data-binary @$SRC -H 'Content-Type: text/plain' $URL/$1`
curl "https://storage.googleapis.com/$BUCKET/$OUTFILE"