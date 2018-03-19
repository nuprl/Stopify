# Stopify [![Build Status](http://23.20.114.147:5000/buildStatus/icon?job=stopify-build/master)](http://23.20.114.147:5000/blue/organizations/jenkins/stopify-build/activity?branch=master)

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

To learn how to use Stopify in your own project, see the 
[Stopify Manual](http://www.stopify.org/manual.html).

For a technical overview of Stopify, see our PLDI 2018 paper
[Putting in All the Stops: Execution Control for JavaScript](https://arxiv.org/abs/1802.02974).
