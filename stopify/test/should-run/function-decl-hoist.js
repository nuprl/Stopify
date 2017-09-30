(function () {
  function Isolate() {
  }
  init();
  function init() {
    Isolate.$isolateProperties = Object.create(null);
    Isolate.$finishIsolateConstructor = function (oldIsolate) {
      var isolateProperties = oldIsolate.$isolateProperties;
      function Isolate() {
      }
      Isolate.$isolateProperties = isolateProperties;
      return Isolate;
    };
  }
  Isolate = Isolate.$finishIsolateConstructor(Isolate);
})();
