"use strict";

const assert = require('assert');

var sjcl = {};

sjcl.hmac = function(a, b) {
  return 1
};

sjcl.hmac.prototype.mac = function(a, b) {
    return 1
};

assert.equal(typeof sjcl.hmac.prototype.mac, 'function')
