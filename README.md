# Stopify [![Build Status](http://23.20.114.147:5000/buildStatus/icon?job=stopify-build/master)](http://23.20.114.147:5000/job/stopify-build/job/master/)

Stopify is a JavaScript-to-JavaScript compiler that makes JavaScript a better
target language for high-level languages and web-based programming tools.
Stopify enhances JavaScript with debugging abstractions, blocking operations,
and support for long-running computations.

Suppose you have a compiler *C* from language *L* to JavaScript. You
can apply Stopify to the output of *C* and leave *C* almost entirely
unchanged. Stopify will provide the following features:

1. Stopify will support long-running *L* programs without freezing the browser
   tab. In particular, programs can access the DOM and are not limited to
   Web Workers.

2. Stopify can pause or terminate an *L* program, even if it is an infinite
   loop.

3. Stopify can set breakpoints or single-step through the *L* program, if
   *C* generates source maps.

4. Stopify can simulate an arbitrarily deep stack and proper
   tail calls. This feature is necessary to run certain functional programs
   in the browser.

5. Stopify can simulate blocking operations on the web.

We have tested Stopify with ten languages: (1) C++, (2) Clojure, (3) Dart, (4)
Java, (5) JavaScript, (6) OCaml, (7) Pyret, (8) Python, (9) Scheme, and (10)
Scala. Some of these are available on the Stopify demo page
([www.stopify.org](http://www.stopify.org)) and the rest are coming soon.

The rest of this README will guide you through installing Stopify and
applying it to your own programming language.

## Quick Start

1. Install the `stopify` executable using NPM (or Yarn):

```
npm install -g stopify
```

2. Create a JavaScript program that needs to be stopified. For example, the
   following program has an infinite loop that make browsers lock up.
   Save the following  program as `input.js`:

   ```
   const elt = document.createElement("div");
   document.body.appendChild(elt);

   var i = 0;
   var j = 0;
   while(true) {
     if (i++ == 10000000) {
       j++;
       elt.innerText = "Still runninng ... " + (new Date());
       i = 0;
     }
   }
   ```

3. Apply Stopify to the program:

   ```
   stopify --external-rts -t lazy input.js output.js
   ```

4. To run the program in a browser, we need to (1) create an HTML page that
   first loads the Stopify runtime system and then loads `output.js`
   and (2) specify how frequently the program should yield control to the
   browser. For this *Quick Start*, we can use Stopify's testing framework.
   The following command prints a (long!) URL:

   ```
   stopify-url --estimator velocity -y 100 -t lazy output.js
   ```

5. Visit the URL that it generates in your Web browser. You'll see that the
   program "just works" and periodically prints the current time. In contrast,
   if you load the original program in a browser, it will not print anything
   and will eventually crash the browser tab.

Stopify has several command-line flags that affect program performance. Some
flags produce better results on particular browsers. Other flags let you
specify the *sub-language of JavaScript* that the input program uses.
JavaScript has several peculiar features that make stopification difficult.
Fortunately, when the input to Stopify is the output of some other compiler
*C*, you can typically identify JavaScript features that *C* does not use.
Stopify can exploit this information to further improve performance.
Intuitively, the image of a simple language (e.g., OCaml, Scheme, etc.) in
JavaScript is a simple sub-language of JavaScript.

Finally, instead of stopifying all the JavaScript that *C* produces (which
may include an enormous runtime system for the source language), you can
use Stopify as a library or as a Babel plugin and selectively apply it to
smaller units of code.

## Stopify CLI

The `stopify` compiler takes several command-line options:

- `--transform <transform>` (required) How should continuations be represented?
   The valid options are `lazy`, `retval`, and `eager`. There are two
   additional options that are only useful for benchmarking and debugging:
   `original` leaves the input program unchanged and `fudge` applies all
   transformations with the expection of continuation instrumentation.)

- `--new` (optional) How should Stopify handle JavaScript's `new` operator?
  Stopify can either desugar (`--new wrapper`) all `new`s to ordinary function
  calls or leave them intact (`--new direct`). By default, Stopify uses
  desugaring.

- `--es` (optional) Should Stopify support custom `valueOf` and `toString`
  methods? By default, Stopify assumes that the program does not define
  these methods (`--es=sane`). Use `--es=es5` to support programs that
  define these methods.

- `--js-args` (optional) How should Stopify support JavaScript's
  `arguments` object? By default, Stopify assumes that the program does not
  use `arguments` to access declared formal arguments (`--js-args=simple`).
  Use `--js-args=faithful` if the input program does not behave this way.


- `--external-rts` (optional) You need to set this flag. Without it, Stopify
  assumes you are running tests.

- `--debug` (optional) Set this flag if you trying to use Stopify to support
   single-stepping and breakpoints.

- `--cache <DIR>` do not use this flag

The `stopify-url` program produces a URL that runs a stopified program in
the browser. This program also takes several command-line options:

- `--env <env>` (required)  Use `--env node`. This flag should be removed.

- `--transform <transform>` (required). This must be the same that was
  used during compilation. This flag should be removed.

- `--estimator <estimator>` (required). How should Stopify estimate the
  elapsed time? Use `--estimator=velocity` (we should make this the default)

- `-y, --yield <interval>` (required). How frequently should Stopify
  yield control to the browser. We should make 100 the default.

- `--variance` (internal). This flag is required for benchmarking.

- `--stop <time>` (interval). Force the program to terminate after `<time>`
  milliseconds elapse.

- `-r, --resample-interval <interval>` How frequently should Stopify check the
  system time? By default, it is the same as `--yield`.

- `--time-per-elapsed` ???

## Development

We use [Node 8.5+](https://nodejs.org/en/) and
[Yarn 1.0+](https://yarnpkg.com/en/).
Stopify's integration tests require Chrome, Firefox, ChromeDriver, and
GeckoDriver.

The Stopify repository includes the main project and several helpers for the
Stopify demo, etc. Stopify itself is in the `stopify` sub-directory of the
repository (`cd stopify`). To build Stopify:

```
yarn install
yarn run build
```

To run all test cases:

```
yarn run test
```

Note that running all tests may take up to 30 minutes. (We run tests on Firefox
and Chrome using several different transformations.) The following command only
runs tests using exceptional continuations:

```
yarn run test --testNamePattern=lazy
```

Unless you're modifying the representation of continuations, it is usually
adequate ot test your changes with only one continuation representation.

You can run a Stopified program in the terminal (using Node), which is usually
the fastest way to test a small change. To do so, compile it without
the `--external-rts` flag and then it using `./bin/run`. This program
takes the same command-line arguments as `stopify-url`.


### Optimization annotations

[FILL] The following sections need work


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

When doing this, we need to be careful that the comment is directly before the
call. To ensure that stopify recognizes the annotation, [check the
AST](astexplorer.net) and make sure that the annotation is present as a
`leadingComment` for the desired CallExpression.

## Stopify with Webpack

Stopify is a Babel plugin. Therefore, you can use it with [babel-loader]
to transform modules while applying Webpack. To do so, you should specify
that `stopify` is an external variable and load `stopify.bundle.js` before
the stopified code.

[babel-loader]: https://github.com/babel/babel-loader
