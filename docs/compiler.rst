.. _
.. _compiler:

========
Compiler
========

Web-based Compiler
===================

To run the compiler from a web page, include the script
`stopify-full.bundle.js`. Use the following command to get the path to this
script on your local machine:

.. code-block:: bash

  stopify-path stopify-full.bundle.js

This bundle exposes the following function:

.. code-block:: typescript

  stopify.stopifyLocally(url: string, copts?: CompileOpts, ropts?: RuntimeOpts): AsyncRun


Command-line Compiler
=====================

The Stopify CLI compiler requires the name of the input file and the name of
the output file. In addition, the compiler has several optional flags:

.. code-block:: bash

  stopify [compile-opts] input.js output.js

To load a compiled file in the browser, the Stopify runtime provides the
following function:

.. code-block:: typescript

  stopify.stopify(url: string, opts?: RuntimeOpts): AsyncRun

Compiler as a Node Library
==========================

To use the Stopify compiler a Node library, first import the Stopify library:

.. code-block:: typescript

  const stopify = require('stopify');

This library exposes the following function:

.. code-block:: typescript

  stopify.stopify(url: string, copts?: CompileOpts): string

To load a compiled file in the browser, the Stopify runtime provides the
following function:

.. code-block:: typescript

  stopify.stopify(url: string, opts?: RuntimeOpts): AsyncRun



.. _compileopts:

Compiler Options
================

The Stopify compiler accepts the following options:

.. code-block:: typescript

  interface CompilerOpts {
    captureMethod?: "lazy" | "retval" | "eager" | "original", // --transform from the CLI
    newMethod?: "wrapper" | "direct",                         // --new from the CLI
    getters?: boolean,                                        // --getters from the CLI
    debug?: boolean,                                          // --debug from the CLI
    eval?: boolean,                                           // --eval from the CLI
    es?: "sane" | "es5",                                      // --es from the CLI
    hofs: "builtin" | "fill",                                 // --hofs from the CLI
    jsArgs?: "simple" | "faithful" | "full",                  // --js-args from the CLI
    externals?: string[]                                      // not supported on the CLI
  }

If an option is not set, Stopify picks a default value that is documented
below. By default, Stopify is *not* completely faithful to the semantics of
JavaScript (certain JavaScript features are difficult to support and incur a
high runtime cost). Instead, Stopify's default values work with a number of
compilers that we've tested. By default, Stopify does not support getters,
setters, eval, builtin higher-order functions, implicit operations,
``arguments``-object aliasing, and single-stepping. If you think you may need
these features, you will need to set their corresponding flags.


.. _transformation:

Transformation (``.captureMethod``)
-----------------------------------

Stopify uses first-class continuations as a primitive to implement its
execution control features. Stopify can represent continuations in several
ways; the fastest approach depends on the application and the browser. The
valid options are ``"lazy"``, ``"retval"``, ``"eager"``, and ``"original"``.
For most cases, we recommend using ``"lazy"``.

.. _new-method:

Constructor Encoding (``.newMethod``)
-------------------------------------

Stopify implements two mechanisms to support suspending execution within the
dynamic extent of a constructor call.

- ``"wrapper"`` desugars all ``new`` expressions to ordinary function calls,
  using ``Object.create``.

- ``"direct"`` preserves ``new`` expressions, but instruments all functions to
  check if they are invoked as constructors, using ``new.target``.

The fastest approach depends on the browser. We recommend using ``wrapper``.

.. _eval-flag:

Eval Support (``.eval``)
------------------------

How should Stopify handle JavaScript's ``eval`` function? By default, this flag
is ``false`` and Stopify leaves ``eval`` unchanged.  Since Stopify typically
does not rename variables, using a stopfied program can use ``eval``, but the
evaluated code may lock-up the browser if it has an infinite loop.

If set to ``true``, Stopify rewrites calls to JavaScript's ``eval`` function to
invoke the Stopify compiler. (Note: Stopify does *not* rewrite ``new Function``
and dynamically generated ``<script>`` tags.) This allows Stopify to control
execution in dynamically generated code. Naturally, this requires the online
compiler.  However, the feature incurs considerable overhead.

.. _implicit-ops-flag:

Implicit Operations (``.es``)
-----------------------------

Stopify can suspend execution within user-written ``valueOf()`` and
``toString()`` methods that JavaScript invokes implicitly.

For example, the following program is an infinite loop in JavaScript:

.. code-block:: javascript

  var x = { toString: function() { while(true) { } } };
  x + 1;

With the implicit operations flag is set to ``"es5"``, Stopify will be able to
gracefully suspend the program above. With the flag set to ``"sane"``, Stopify
will not be able to detect the the infinite loop. We have found that most
source language compilers do not rely on implicit operations, thus it is
usually safe to use ``"sane"``.

.. _arguments-flag:

Fidelity of ``arguments`` (``.jsArgs``)
---------------------------------------

The ``arguments`` object makes it difficult for Stopify to resume execution
after suspension. Stopify supports ``arguments`` in full, but it also supports
two simple special cases that improve performance.

- Use ``"simple"`` if the program (1) does not use ``arguments`` to access
  declared formal arguments and (2) only reads additional arguments using the
  ``arguments`` object.

- Use ``"faithful"`` if the program (1) does not use ``arguments`` to access
  declared formal arguments and (2) may read or write additional arguments
  using the ``arguments`` object.

- Use ``"full"`` for full support of JavaScript's ``arguments`` object.

.. _hofs-flag:

Higher Order Functions (``.hofs``)
----------------------------------

Programs cannot use bulitin higher-order functions (e.g., ``.map``,
``.filter``, etc.) with Stopify, since Stopify cannot instrument native code.
The ``.hofs`` flag has two possible values:

- Use ``"builtin"`` if the program does not use any native higher-order
  functions.

- Use ``"fill"`` to have Stopify rewrite programs that use native higher-order
  functions to use polyfills written in JavaScript.

.. _getters-flag:

Getters and Setters (``.getters``)
----------------------------------

Programs that suspend execution within getters/setters incur a lot of overhead
with Stopify. The ``.getters`` flag has two possible values:

- Use ``true`` to have Stopify instrument the program to support suspension
  within getters and setters.

- Use ``false`` if the program does not use getters and setters.

.. _debug-flag:

Single-stepping and Breakpointing (``.debug``)
----------------------------------------------

Set ``.debug`` to ``true`` to enable support for single-stepping and
breakpointing. However, note that this requires more instrumentation and slows
the program down further.

External Symbols (``.externals``)
---------------------------------

An array of free variables that the program is may reference. E.g.,
`[ 'console', 'window', 'alert' ]`.