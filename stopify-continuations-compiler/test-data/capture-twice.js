var assert = require('assert');
let saved = false;
let i = 0;
function myFun() {
  return captureCC(function(k) {
    if (saved === false) {
      saved = k;
      return k("first");
    };
  });
}

function myGun() {
  let r = myFun();
  i++;
  switch (r) {
    case "first": return saved("second");
    case "second": return saved("third");
    case "third": return "done";
    default: throw "Very bad";
  }
}
assert(myGun() === "done" && i === 3);