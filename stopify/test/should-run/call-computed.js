const assert = require('assert');
function foo() { return 7; }

assert.equal(foo['call']({}), 7);
