var MYFUNC = function REC(n) {
  var FORCEBOX = function() { return REC(0); };
  if (n === 0) {
    return 42;
  }
  else {
    return REC(n - 1);
  }
};


MYFUNC(1);
