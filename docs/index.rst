=======
Stopify
=======

.. figure:: img/logo.png

  ..

    by Samuel Baxter, Arjun Guha, Shriram Krishnamurthi, Rachit Nigam, and Joe Gibbs Politz

Table of Contents
-----------------

.. toctree::
  :maxdepth: 2
  :caption: Stopify User's Manual

  quickstart
  overview
  compiler
  runtime
  illustrative_examples
  acknowledgements
  release_notes

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

In many cases, it is possible to "blindly" use Stopify by applying it to the
output of your compiler. However, Stopify will compile faster, produce faster
code, and support more features, if your compiler cooperates with Stopify in
particular ways. This manual will guide you through using Stopify with your own
compiler.

**Warning**
-----------
This manual is a work in progress. Many Stopify features remain undocumented. We
will preserve the interfaces documented here in subsequent releases of Stopify.
