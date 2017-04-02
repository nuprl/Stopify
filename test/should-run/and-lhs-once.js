/* plugins: [desugarAndOr] */
var count = 0;
function f() {
  count++;
  return false;
}
var tmp = f() && true;
count

