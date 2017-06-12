#!/bin/bash

# First argument is the path to the JS engine.
# Second argument is the name of the JS engine.
# Third argument is the name of the directory containing the benchmarks.
# Creates the file <engine name>-<dirname>-times.csv
if [ "$(uname)" == "Darwin" ]; then
  TIME=`which gtime`
elif  [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  TIME="/usr/bin/time"
fi
TIMEFLAGS='--append --format "%E"'

function cleanup {
rm -f tmp.js
}

trap cleanup EXIT

if [[ $# -lt 3 ]]; then
  echo 'Not enough arguments provided'
  exit 1
fi

if [[ ! -f $1 ]]; then
  echo "Could not find $1. It should refer to a javascript engine"
  exit 1
fi

ENGINE=$1
NAME=$2
BENCHDIR=$3

# Test the JS engine.
echo '1 + 2' > tmp.js
"$ENGINE" tmp.js
if [[ $? -ne 0 ]]; then
  echo "Failed to execute simple 1 + 2 with $ENGINE."
  exit 1
fi
rm tmp.js

# Cleanup name of the directory.
IFS='/' read -ra a <<< "$BENCHDIR"
LAST=${a[${#a[@]}-1]}

# Make the log file
LOG="$NAME-$LAST-times.csv"
echo "" > $LOG

# Log time taken to run each file.
for i in `ls $BENCHDIR`; do
  echo "running $BENCHDIR/$i"
  echo -n "$i," >> $LOG
  $TIME --output=$LOG $TIMEFLAGS  "$ENGINE" $BENCHDIR/$i
done
