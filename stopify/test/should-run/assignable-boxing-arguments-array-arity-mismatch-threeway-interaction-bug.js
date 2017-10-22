function G() {  while(false) {} };

/*
 * The call to G forces suspension (with -y 1 --estimator=countdown)
 * The local function H assigns to x, which forces x to be boxed
 * The function uses arguments, which causes arguments to be materialized
 * as an array.
 */
function F(x) {
  G();
  z = arguments;
  function H() {
    x = 10;
  }
  return typeof x;
}

/*
 * However, we do not provide x here, thus the arguments array above is
 * empty. If we naively materialize arguments, we will not have a box for
 * x.
 */
F();