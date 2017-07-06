/**
 * Implementation shims from [[ https://developer.mozilla.org/en-US/ ]]
 */
Array.prototype.reduceRight = function(callback /*, initialValue*/) {
  'use strict';
  if (null === this || 'undefined' === typeof this) {
    throw new TypeError('Array.prototype.reduce called on null or undefined');
  }
  if ('function' !== typeof callback) {
    throw new TypeError(callback + ' is not a function');
  }
  var t = Object(this), len = t.length >>> 0, k = len - 1, value;
  if (arguments.length >= 2) {
    value = arguments[1];
  } else {
    while (k >= 0 && !(k in t)) {
      k--;
    }
    if (k < 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    value = t[k--];
  }
  for (; k >= 0; k--) {
    if (k in t) {
      value = callback(value, t[k], k, t);
    }
  }
  return value;
};

Array.prototype.filter = function(fun/*, thisArg*/) {
  'use strict';

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== 'function') {
    throw new TypeError();
  }

  var res = [];
  var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
  for (var i = 0; i < len; i++) {
    if (i in t) {
      var val = t[i];

      // NOTE: Technically this should Object.defineProperty at
      //       the next index, as push can be affected by
      //       properties on Object.prototype and Array.prototype.
      //       But that method's new, and collisions should be
      //       rare, so use the more-compatible alternative.
      if (fun.call(thisArg, val, i, t)) {
        res.push(val);
      }
    }
  }

  return res;
};

Object.defineProperty(Array.prototype, 'reduce', {
  value: function(callback /*, initialValue*/) {
    if (this === null) {
      throw new TypeError( 'Array.prototype.reduce ' +
        'called on null or undefined' );
    }
    if (typeof callback !== 'function') {
      throw new TypeError( callback +
        ' is not a function');
    }

    // 1. Let O be ? ToObject(this value).
    var o = Object(this);

    // 2. Let len be ? ToLength(? Get(O, "length")).
    var len = o.length >>> 0;

    // Steps 3, 4, 5, 6, 7
    var k = 0;
    var value;

    if (arguments.length >= 2) {
      value = arguments[1];
    } else {
      while (k < len && !(k in o)) {
        k++;
      }

      // 3. If len is 0 and initialValue is not present,
      //    throw a TypeError exception.
      if (k >= len) {
        throw new TypeError( 'Reduce of empty array ' +
          'with no initial value' );
      }
      value = o[k++];
    }

    // 8. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ! ToString(k).
      // b. Let kPresent be ? HasProperty(O, Pk).
      // c. If kPresent is true, then
      //    i.  Let kValue be ? Get(O, Pk).
      //    ii. Let accumulator be ? Call(
      //          callbackfn, undefined,
      //          « accumulator, kValue, k, O »).
      if (k in o) {
        value = callback(value, o[k], k, o);
      }

      // d. Increase k by 1.
      k++;
    }

    // 9. Return accumulator.
    return value;
  }
});

Array.prototype.every = function(callbackfn, thisArg) {
  'use strict';
  var T, k;

  if (this == null) {
    throw new TypeError('this is null or not defined');
  }

  // 1. Let O be the result of calling ToObject passing the this
  //    value as the argument.
  var O = Object(this);

  // 2. Let lenValue be the result of calling the Get internal method
  //    of O with the argument "length".
  // 3. Let len be ToUint32(lenValue).
  var len = O.length >>> 0;

  // 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
  if (typeof callbackfn !== 'function') {
    throw new TypeError();
  }

  // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
  if (arguments.length > 1) {
    T = thisArg;
  }

  // 6. Let k be 0.
  k = 0;

  // 7. Repeat, while k < len
  while (k < len) {

    var kValue;

    // a. Let Pk be ToString(k).
    //   This is implicit for LHS operands of the in operator
    // b. Let kPresent be the result of calling the HasProperty internal
    //    method of O with argument Pk.
    //   This step can be combined with c
    // c. If kPresent is true, then
    if (k in O) {

      // i. Let kValue be the result of calling the Get internal method
      //    of O with argument Pk.
      kValue = O[k];

      // ii. Let testResult be the result of calling the Call internal method
      //     of callbackfn with T as the this value and argument list
      //     containing kValue, k, and O.
      var testResult = callbackfn.call(T, kValue, k, O);

      // iii. If ToBoolean(testResult) is false, return false.
      if (!testResult) {
        return false;
      }
    }
    k++;
  }
  return true;
};

Object.defineProperty(Array.prototype, 'find', {
  value: function(predicate) {
    // 1. Let O be ? ToObject(this value).
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var o = Object(this);

    // 2. Let len be ? ToLength(? Get(O, "length")).
    var len = o.length >>> 0;

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
    var thisArg = arguments[1];

    // 5. Let k be 0.
    var k = 0;

    // 6. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ! ToString(k).
      // b. Let kValue be ? Get(O, Pk).
      // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
      // d. If testResult is true, return kValue.
      var kValue = o[k];
      if (predicate.call(thisArg, kValue, k, o)) {
        return kValue;
      }
      // e. Increase k by 1.
      k++;
    }

    // 7. Return undefined.
    return undefined;
  }
});

Object.defineProperty(Array.prototype, 'findIndex', {
  value: function(predicate) {
    // 1. Let O be ? ToObject(this value).
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    var o = Object(this);

    // 2. Let len be ? ToLength(? Get(O, "length")).
    var len = o.length >>> 0;

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
    var thisArg = arguments[1];

    // 5. Let k be 0.
    var k = 0;

    // 6. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ! ToString(k).
      // b. Let kValue be ? Get(O, Pk).
      // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
      // d. If testResult is true, return k.
      var kValue = o[k];
      if (predicate.call(thisArg, kValue, k, o)) {
        return k;
      }
      // e. Increase k by 1.
      k++;
    }

    // 7. Return -1.
    return -1;
  }
});

Array.prototype.forEach = function(callback/*, thisArg*/) {

  var T, k;

  if (this == null) {
    throw new TypeError('this is null or not defined');
  }

  // 1. Let O be the result of calling toObject() passing the
  // |this| value as the argument.
  var O = Object(this);

  // 2. Let lenValue be the result of calling the Get() internal
  // method of O with the argument "length".
  // 3. Let len be toUint32(lenValue).
  var len = O.length >>> 0;

  // 4. If isCallable(callback) is false, throw a TypeError exception.
  // See: http://es5.github.com/#x9.11
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  // 5. If thisArg was supplied, let T be thisArg; else let
  // T be undefined.
  if (arguments.length > 1) {
    T = arguments[1];
  }

  // 6. Let k be 0.
  k = 0;

  // 7. Repeat while k < len.
  while (k < len) {

    var kValue;

    // a. Let Pk be ToString(k).
    //    This is implicit for LHS operands of the in operator.
    // b. Let kPresent be the result of calling the HasProperty
    //    internal method of O with argument Pk.
    //    This step can be combined with c.
    // c. If kPresent is true, then
    if (k in O) {

      // i. Let kValue be the result of calling the Get internal
      // method of O with argument Pk.
      kValue = O[k];

      // ii. Call the Call internal method of callback with T as
      // the this value and argument list containing kValue, k, and O.
      callback.call(T, kValue, k, O);
    }
    // d. Increase k by 1.
    k++;
  }
  // 8. return undefined.
};

Array.prototype.map = function(callback/*, thisArg*/) {

  var T, A, k;

  if (this == null) {
    throw new TypeError('this is null or not defined');
  }

  // 1. Let O be the result of calling ToObject passing the |this|
  //    value as the argument.
  var O = Object(this);

  // 2. Let lenValue be the result of calling the Get internal
  //    method of O with the argument "length".
  // 3. Let len be ToUint32(lenValue).
  var len = O.length >>> 0;

  // 4. If IsCallable(callback) is false, throw a TypeError exception.
  // See: http://es5.github.com/#x9.11
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
  if (arguments.length > 1) {
    T = arguments[1];
  }

  // 6. Let A be a new array created as if by the expression new Array(len)
  //    where Array is the standard built-in constructor with that name and
  //    len is the value of len.
  A = new Array(len);

  // 7. Let k be 0
  k = 0;

  // 8. Repeat, while k < len
  while (k < len) {

    var kValue, mappedValue;

    // a. Let Pk be ToString(k).
    //   This is implicit for LHS operands of the in operator
    // b. Let kPresent be the result of calling the HasProperty internal
    //    method of O with argument Pk.
    //   This step can be combined with c
    // c. If kPresent is true, then
    if (k in O) {

      // i. Let kValue be the result of calling the Get internal
      //    method of O with argument Pk.
      kValue = O[k];

      // ii. Let mappedValue be the result of calling the Call internal
      //     method of callback with T as the this value and argument
      //     list containing kValue, k, and O.
      mappedValue = callback.call(T, kValue, k, O);

      // iii. Call the DefineOwnProperty internal method of A with arguments
      // Pk, Property Descriptor
      // { Value: mappedValue,
      //   Writable: true,
      //   Enumerable: true,
      //   Configurable: true },
      // and false.

      // In browsers that support Object.defineProperty, use the following:
      // Object.defineProperty(A, k, {
      //   value: mappedValue,
      //   writable: true,
      //   enumerable: true,
      //   configurable: true
      // });

      // For best browser support, use the following:
      A[k] = mappedValue;
    }
    // d. Increase k by 1.
    k++;
  }

  // 9. return A
  return A;
};
