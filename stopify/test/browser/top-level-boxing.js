// NOTE(arjun): This test case cannot be ported to Node. Top-level "vars"
// in a Node module _are not fields_ of the global object. However,
// undeclared top-level vars in node _are fields_ of the global object.
// Seriously? Just pick one behavior!
//
// Stopify is really designed for the browser and I believe we transform
// undeclared top-level variables into "var" statements, which is safe to do
// in the browser, but apparently unsafe in Node.

var x = function() {
  throw 'very bad';
};

x = function() {

};

window.x();
