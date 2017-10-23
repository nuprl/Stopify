# The Stopify Compilers

Stopify is a collection of compilers. This file contains the documentation
for the various compiler flags and modes.


**TODO**


### Optimization annotations
Stopify supports comment based annotations to tell the compiler to optimize
certain functions and call sites. In order to tell the compiler that
a particular function shouldn't be instrumented, output:

```javascript
/* @stopify flat */
function foo() { ... }
```

**WARNING**: If such a function calls another function that tried to capture
the stack, this function won't be properly restored.

In order to tell the compiler that a call site shouldn't be instrumented,
output:

```javascript
let a = /* @stopify flat */ foo()
```

When doing this, we need to be careful that the comment is directly before
the call. To ensure that stopify recognizes the annotation, [check the AST](astexplorer.net) and make sure that the annotation is present as a
`leadingComment` for the desired CallExpression.
