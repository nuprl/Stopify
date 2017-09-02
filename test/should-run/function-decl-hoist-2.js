function Isolate() {
}
var init = function() {
  Date.now();
  Isolate.method = function (oldIsolate) {
  };
}
init();

Isolate = Isolate.method(Isolate);
