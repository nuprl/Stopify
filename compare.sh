#!/bin/bash

echo "**** CPS ****"
./bin/stopify --optimize -t cps -i triangle.js > triangle.cps.js
node --harmony_tailcalls triangle.cps.js

echo "**** Generators ****"
./bin/stopify --optimize -t yield -i triangle.js > triangle.yield.js
node --harmony_tailcalls triangle.yield.js