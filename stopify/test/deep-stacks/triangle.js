'use strict';

function triangle(n) {
    if (n <= 0) {
        return 1;
    } else return n + triangle(n - 1);
}

for (var i = 0; i < 50 * 500; i++) {
    triangle(500);
}

/* Try to run:

./bin/compile -t lazy triangle.js triangle.lazy.js && \
  ./bin/run  -t lazy triangle.lazy.js

/bin/compile -t lazyDeep triangle.js triangle.deep.js && \
  ./bin/run -d 500 -t lazyDeep triangle.deep.js 


*/