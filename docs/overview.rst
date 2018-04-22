========
Overview
========


Stopify is a JavaScript-to-JavaScript compiler that makes JavaScript a better
target language for high-level languages and web-based programming tools.
Stopify enhances JavaScript with debugging abstractions, blocking operations,
and support for long-running computations.

Suppose you have a compiler *C* from language *L* to JavaScript. You can apply
Stopify to the output of *C* and leave *C* almost entirely unchanged. Stopify
will provide the following features:

- Stopify will support long-running *L* programs without freezing the browser
  tab. In particular, programs can access the DOM and are not limited to Web
  Workers.

- Stopify can pause or terminate an *L* program, even if it is an infinite loop.

- Stopify can set breakpoints or single-step through the *L* program, if *C*
  generates source maps.

- Stopify can simulate an arbitrarily deep stack and proper tail calls. This
  feature is necessary to run certain functional programs in the browser.

- Stopify can simulate blocking operations on the web.

To support these feature, Stopify has two major components:

- A :ref:`Compiler` that transforms ordinary JavaScript to stopified JavaScript,
  and

- A :ref:`runtime` that runs stopified JavaScript provides an API for
  execution control.

You can run the Stopify compiler in three ways:

1. **Hosted on a web page**: This is the easiest way to use Stopify. Moreover,
   when the compiler is hosted on a web page, your system will be able to
   compile users' program even when they are offline.

2. **As a command-line tool**: If your system already compiles code on a server
   (e.g., you run an *L*-to-JS compiler that does not run in the browser), then
   you may wish to run the compiler on the server.

3. **As a Node library**: If your server is written in Node, you may wish to
   use the compiler as a library. However, note that Stopify may take several
   seconds to compile large programs (i.e., programs with thousands of lines of
   JavaScript) and block connections to the Node server.

Both the compile and runtime have several options. Some of these options only
affect performance, whereas other options affect the sub-language of JavaScript
that the compiler targets (which in turn may affect performance).
