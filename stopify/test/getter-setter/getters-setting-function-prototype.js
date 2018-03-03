"use strict";

var sjcl = {};

sjcl.hmac = function(a, b) {
  return 1
};

sjcl.hmac.prototype.mac = function(a, b) {
    return 1
};

if (typeof sjcl.hmac.prototype.mac !== 'function') {
  throw 'error';
}
