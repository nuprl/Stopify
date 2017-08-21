function A() { }
function C() {
  function D() {
    A();
  }
  return D;
}

