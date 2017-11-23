#!/bin/bash

set -x
set -e
cd dist
git add --all .
git commit -m "Updated website"
git push