// Do not directly use this file. We stopify and webpack this file for each
// type of transformation.

function array_sort(o: any, comparator?: any): any {
  "use strict";

  function min(a: any, b: any) {
    return a < b ? a : b;
  }

  function stringComparator(a: any, b: any) {
    var aString = a.string;
    var bString = b.string;

    var aLength = aString.length;
    var bLength = bString.length;
    var length = min(aLength, bLength);

    for (var i = 0; i < length; ++i) {
      var aCharCode = aString.charCodeAt(i);
      var bCharCode = bString.charCodeAt(i);

      if (aCharCode === bCharCode) {
        continue;
      }

      return aCharCode - bCharCode;
    }

    return aLength - bLength;
  }

  // Move undefineds and holes to the end of a sparse array. Result is [values..., undefineds..., holes...].
  function compactSparse(array: any, dst: any, src: any, length: any) {
    var seen: any = { };
    var valueCount = 0;
    var undefinedCount = 0;

    // Clean up after the in-progress non-sparse compaction that failed.
    for (let i = dst; i < src; ++i) {
      delete array[i];
    }

    for (var obj = array; obj; obj = Object.getPrototypeOf(obj)) {
      var propertyNames = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < propertyNames.length; ++i) {
        var index = propertyNames[i];
        if (index < length) { // Exclude non-numeric properties and properties past length.
          if (seen[index]) { // Exclude duplicates.
            continue;
          }
          seen[index] = 1;

          var value = array[index];
          delete array[index];

          if (value === undefined) {
            ++undefinedCount;
            continue;
          }

          array[valueCount++] = value;
        }
      }
    }

    for (var i = valueCount; i < valueCount + undefinedCount; ++i) {
      array[i] = undefined;
    }

    return valueCount;
  }

  function compactSlow(array: any, length: any) {
    var holeCount = 0;

    for (var dst = 0, src = 0; src < length; ++src) {
      if (!(src in array)) {
        ++holeCount;
        if (holeCount < 256) {
          continue;
        }
        return compactSparse(array, dst, src, length);
      }

      var value = array[src];
      if (value === undefined) {
        continue;
      }

      array[dst++] = value;
    }

    var valueCount = dst;
    var undefinedCount = length - valueCount - holeCount;

    for (var i = valueCount; i < valueCount + undefinedCount; ++i) {
      array[i] = undefined;
    }

    for (var i = valueCount + undefinedCount; i < length; ++i) {
      delete array[i];
    }

    return valueCount;
  }

  // Move undefineds and holes to the end of an array. Result is [values..., undefineds..., holes...].
  function compact(array: any, length: any) {
    for (var i = 0; i < array.length; ++i) {
      if (array[i] === undefined) {
        return compactSlow(array, length);
      }
    }

    return length;
  }

  function merge(dst: any, src: any, srcIndex: any, srcEnd: any, width: any, comparator: any) {
    var left = srcIndex;
    var leftEnd = min(left + width, srcEnd);
    var right = leftEnd;
    var rightEnd = min(right + width, srcEnd);

    for (var dstIndex = left; dstIndex < rightEnd; ++dstIndex) {
      if (right < rightEnd) {
        if (left >= leftEnd) {
          dst[dstIndex] = src[right++];
          continue;
        }

        let comparisonResult = comparator(src[right], src[left]);
        if ((typeof comparisonResult === "boolean" && !comparisonResult) || comparisonResult < 0) {
          dst[dstIndex] = src[right++];
          continue;
        }

      }

      dst[dstIndex] = src[left++];
    }
  }

  function mergeSort(array: any, valueCount: any, comparator: any) {
    var buffer : any = [ ];
    buffer.length = valueCount;

    var dst = buffer;
    var src = array;
    for (var width = 1; width < valueCount; width *= 2) {
      for (var srcIndex = 0; srcIndex < valueCount; srcIndex += 2 * width) {
        merge(dst, src, srcIndex, valueCount, width, comparator);
      }

      var tmp = src;
      src = dst;
      dst = tmp;
    }

    if (src !== array) {
      for(var i = 0; i < valueCount; i++) {
        array[i] = src[i];
      }
    }
  }

  function bucketSort(array: any, dst: any, bucket: any, depth: any) {
    if (bucket.length < 32 || depth > 32) {
      mergeSort(bucket, bucket.length, stringComparator);
      for (var i = 0; i < bucket.length; ++i) {
        array[dst++] = bucket[i].value;
      }
      return dst;
    }

    var buckets: any = [ ];
    for (var i = 0; i < bucket.length; ++i) {
      var entry = bucket[i];
      var string = entry.string;
      if (string.length === depth) {
        array[dst++] = entry.value;
        continue;
      }

      var c = string.charCodeAt(depth);
      if (!buckets[c]) {
        buckets[c] = [ ];
      }
      buckets[c][buckets[c].length] = entry;
    }

    for (var i = 0; i < buckets.length; ++i) {
      if (!buckets[i]) {
        continue;
      }
      dst = bucketSort(array, dst, buckets[i], depth + 1);
    }

    return dst;
  }

  function comparatorSort(array: any, length: any, comparator: any) {
    var valueCount = compact(array, length);
    mergeSort(array, valueCount, comparator);
  }

  function stringSort(array: any, length: any) {
    var valueCount = compact(array, length);

    var strings = new Array(valueCount);
    for (var i = 0; i < valueCount; ++i) {
      strings[i] = { string: array[i], value: array[i] };
    }

    bucketSort(array, 0, strings, 0);
  }

  var array = o;

  var length = array.length >>> 0;

  // For compatibility with Firefox and Chrome, do nothing observable
  // to the target array if it has 0 or 1 sortable properties.
  if (length < 2) {
    return array;
  }

  if (typeof comparator === "function") {
    comparatorSort(array, length, comparator);
  }
  else if (comparator === null || comparator === undefined) {
    stringSort(array, length);
       }
  else {
    throw new TypeError("Array.prototype.sort requires the comparsion function be a function or undefined");
       }

  return array;
}

var stopifyArrayPrototype = {
  __proto__: Array.prototype,
  map: function(f: any) { 
    if (arguments.length !== 1) {
      throw new Error(`.map requires 1 argument`);
    }

    let result = [ ];
    for (let i = 0; i < this.length; ++i) {
      result.push(f(this[i]));
    }
    return stopifyArray(result);
  },
  filter: function(f: any) {
    if (arguments.length !== 1) {
      throw new Error(`.filter requires 1 argument`);
    }
 
    let result = [ ];
    for (let i = 0; i < this.length; ++i) {
      if (f(this[i])) {
        result.push(this[i]);
      }
    }
    return stopifyArray(result);
  },  
  reduceRight: function(f: any, init: any) {
    if (arguments.length !== 2) {
      throw new Error(`.reduceRight requires 2 arguments`);
    }

    var arrLen = this.length;
    var acc = init;
    var i = arrLen - 1;
    while (i >= 0) {
      acc = f(acc, this[i]);
      i = i - 1;
    }
    return acc;
  },
  reduce: function(f: any, init: any) {
    if (arguments.length !== 2) {
      throw new Error(`.reduce requires 2 arguments`);
    }

    var arrLen = this.length;
    var acc = init;
    var i = 0;
    while (i < arrLen) {
      acc = f(acc, this[i]);
      i = i + 1;
    }
    return acc;
  },
  some: function(pred: any) {
    if (arguments.length !== 1) {
      throw new Error(`.some requires 1 argument`);
    }

    var i = 0;
    var l = this.length;
    while (i < l) {
      if (pred(this[i])) {
        return true;
      }
      i = i + 1;
    }
    return false;
  },
  every: function(pred: any) {
    if (arguments.length !== 1) {
      throw new Error(`.every requires 1 argument`);
    }

    var i = 0;
    var l = this.length;
    while (i < l) {
      if (!pred(this[i])) {
        return false;
      }
      i = i + 1;
    }
    return true;
  },
  find: function(pred: any) {
    if (arguments.length !== 1) {
      throw new Error(`.find requires 1 argument`);
    }

    var i = 0;
    var l = this.length;
    while (i < l) {
      if (pred(this[i])) {
        return this[i];
      }
      i = i + 1;
    }
  },
  findIndex: function(pred: any) {
    if (arguments.length !== 1) {
      throw new Error(`.findIndex requires 1 argument`);
    }

    var i = 0;
    var l = this.length;
    while (i < l) {
      if (pred(this[i])) {
        return i;
      }
      i = i + 1;
    }
    return -1;
  },
  // NOTE(arjun): Ignores thisArg
  forEach(f: any) {
    if (arguments.length !== 1) {
      throw new Error(`.forEach requires 1 argument`);
    }
    var i = 0;
    var l = this.length;
    while (i < l) {
      f(this[i]);
      i = i + 1;
    }
  },
  sort: function(comparator: any) {
    if (arguments.length !== 1) {
      throw new Error(`.sort requires 1 argument`);
    }
    return stopifyArray(array_sort(this, comparator));
  }
};

export function stopifyArray(arr: any) {
  // @stopify flat
  Reflect.setPrototypeOf(arr, stopifyArrayPrototype);
  return arr;
}
