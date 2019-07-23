# @stopify/higher-order-functions

JavaScript programs that use native higher-order functions (e.g.,
``Array.prototype.map``, ``Array.prototype.filter``, etc.) are not compatible
with Stopify, since Stopify cannot instrument native functions to capture
continuations. This package provides polyfills for these functions that work
with Stopify.

# Usage

Before compiling the program with Stopify, use the compiler in this library to
call the polyfill functions:

```javascript
const ast = babylon.parse(code);
const polyfilled = polyfillHofFromAst(ast.program);
const runner = stopify.stopifyLocallyFromAst(polyfilled,
    undefined, compilerOpts, runtimeOpts);
```

This wraps arrays to call ``$stopifyArray``, which needs to be a global:

```javascript
runner.g.$stopifyArray: function(array: any) {
    return require('@stopify/higher-order/functions/dist/ts/mozillaHofPolyfill.lazy')
        .stopifyArray(array);
}
```