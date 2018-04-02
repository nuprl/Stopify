========
Overview
========

The stopify package includes several components:

- A command-line compiler (the ``stopify`` executable).

- A compiler that can be used as a library from Node.

- A runtime system that is bundled for use in the browser. You can get the
  local path of this bundle using the following command:

::

  stopify-path stopify.bundle.js

- A compiler and runtime system that are bundled for the browser. This bundle
  has a lot more code than the runtime-only bundle. However, running Stopify in
  the browser is useful if your users have spotty Internet connections. You can
  get the local path of this bundle using the following command:

::

  stopify-path stopify-full.bundle.js

Note that :doc:`quickstart` presented the command-line compiler with the
runtime-only bundle. The rest of this manual presents other ways to use
Stopify.

The Command-Line Compiler
=========================

The Stopify CLI compiler requires the name of the input file and the name of
the output file. In addition, the compiler has several optional flags:

::

  stopify [flags] input.js output.js

The optional flags are:

- ``-t`` or ``--transform`` selects the continuation implem,entation to use
  (REF).

- ``-n`` or ``--new`` selects the encoding for constructors (REF).

- ``--eval`` or ``--no-eval`` determine if JavaScript's ``eval`` is supported
  (REF).

- ``--es`` determines if JavaScript's implicit operations are supported (REF).

- ``--hofs`` determines if JavaScript's builtin higher-order functions are
  supported (REF).

- ``--js-args`` determines how faithfully Stopify should support the
  ``arguments`` object (REF).

- ``--getters`` or ``--no-getters`` determine if Stopify should support getters
  and setters (REF).

- ``--debug``: should Stopify support single-step debugging (REF).

If a flag is not set, Stopify picks a default value that is documented in the
subsection for each flag. By default, Stopify is *not* completely faithful to
the semantics of JavaScript (certain JavaScript features are difficult to
support and incur a high runtime cost). Instead, Stopify's default values work
with a number of compilers that we've tested. By default, Stopify does not
support getters, setters, eval, builtin higher-order functions, implicit
operations, ``arguments``-object aliasing, and single-stepping. If you think
you may need these features, you will need to set their corresponding flags.

To load a compiled file in the browser, the Stopify runtime provides the
following function:

::

  stopify.stopify(url: string, opts?: RuntimeOpts): AsyncRun

Above, ``url`` should be the address of the compiled file (i.e., hosted on your
web server) and ``url`` is an optional runtime configuration (REF). The result
of this function is an ``AsyncRun`` object (REF).

Runtime Configuration
=====================

The Stopify runtime system takes a dictionary of options with the following
type:

::

  interface RuntimeOpts {
    estimator?: "velocity" | "reservoir" | "exact" | "countdown",
    yieldInterval?: number    /* must be greater than zero */,
    stackSize?: number        /* must be greater than zero */
    restoreFrames?: number    /* must be greater than zero */
  }

The first two options control how frequently Stopify yields control to the
browser (``yieldInterval``) and the mechanism that it uses to determine elapsed
time (``estimator``). The last two options can be used to simulate a larger
stack than what JavaScript natively provides.

Time estimator (``.estimator``)
-------------------------------
By default, Stopify uses the ``velocity`` estimator that samples the current
time (using ``Date.now()``) and tries to yield every 100 milliseconds.  The
``velocity`` estimator dynamically measures the achieved yield interval and
adapts how frequently it yields accordingly. This mechanism is inexact, but
performs well. You can adjust the yield interval, but we do not recommend using
a value lower than 100.

The ``reservoir`` estimator samples the current time using *reservoir sampling*
(i.e., the probability of resampling the current time decreases as the program
runs longer). This technique is less robust than ``velocity`` to fluctuations
in program behavior, but still outperforms other methods. This usually has a
lower runtime overhead than ``velocity``, but sacrifices accuracy. We recommend
``velocity`` for a more general, nondeterministic estimator.

The ``countdown`` estimator yields after exactly *n* yield points have passed.
With this estimator, the ``yieldInterval`` is interpreted as the value of $n$
and not a duration. We do not recommend using this estimator in practice, since
a good value of $n$ will depend on platform performance and program
characteristics that are very hard to predict. However, it is useful for
reproducing bugs in Stopify, since the ``velocity`` estimator is
nondeterministic.

Finally, the ``exact`` estimator checks the current time at every yield point,
instead of sampling the time. This has a higher runtime overhead than
``velocity`` and we do not recommend it.

Unbounded stacks (``.stackSize`` and ``.restoreFrames``)
--------------------------------------------------------

On certain browsers, the JavaScript stack is very shallow. This is a problem
for programming languages that rely heavily on recursion (e.g., idiomatic
functional code). If this is not a concern, you can ignore these options.

To support heavily recursion code, Stopify can spill stack frames on to the
heap. Therefore, a program will *never* throw a stack overflow error (however,
it may run out of memory). To do so, it tracks the depth of the JavaScript
stack and spills stack frames when the stack depth exceeds ``stackSize``.
Similarly, when resuming computation, the ``restoreFrames`` parameter
determines how many saved stack frames are turned into JavaScript stack frames.

To maximize performance, ``stackSize`` should be as high as possible and
``restoreFrames`` should be equal to ``stackSize``. The largest possible value
of ``stackSize`` depends on the source language and browser. In our experience,
a value of 500 works well.


The ``AsyncRun`` Interface
==========================

::

  interface AsyncRun {
    run(onDone: () => void,
        onYield?: () => void,
        onBreakpoint?: (line: number) => void): void;
    pause(onPaused: (line?: number) => void): void;
    resume(): void;
    setBreakpoints(line: number[]): void;
    step(onStep: (line: number) => void): void;
    pauseImmediate(callback: () => void): void;
    continueImmediate(result: any): void;
  }

The ``AsyncRun`` interface (REF) provides methods to run, stop, and control the
execution of a stopified program. The interface provides several methods, none
of which should be used directly by the stopified program. The following
methods are meant to be used by the driver program that controls execution
(e.g., a web-based IDE):

- The ``run`` method starts execution and requires a callback that gets invokes
  when execution completes. You may provide optional callbacks that are invoked
  when the program yields control and when a breakpoint is reached.

- The ``setBreakpoint`` method sets the active breakpoints.

- The ``pause`` method pauses the program at the next yield point and requires
  an optional callback that is invoked when the program has paused.

- The ``resume`` method resumes execution after a pause.

- The ``step`` method resumes execution and pauses again at the next yield
  point.

The following methods are are meant to be used by non-blocking JavaScript
functions to provide simulated blocking interface to the stopified program:

- The ``pauseImmediate`` method suspends the stopified program and invokes the
  provided callback. A function should not execute anything after invoking
  ``pauseImmediate``. Typically, a function that uses ``pauseImmediate`` will
  use it in a ``return`` statement.

- The ``continueImmediate`` function resumes execution with the provided value.

REF has several examples that use these methods to implement simulated blocking
operations.

The Online Compiler
===================

The file ``stopify-full.bundle.js`` packages the compiler and runtime system
for use the browser. You can get the local path of this bundle using the
following command:

::

  stopify-path stopify-full.bundle.js

This bundle exposes the following function:

::

  stopify.stopifyLocally(url: string, copts?: CompileOpts, ropts?: RuntimeOpts): AsyncRun

The optional ``CompilerOpts`` is dictionary with the following type:

::

  interface CompilerOpts {
    getters?: boolean,
    debug?: boolean,
    captureMethod?: "lazy" | "retval" | "eager" | "original",
    newMethod?: "wrapper" | "direct",
    eval?: boolean,
    es?: "sane" | "es5",
    hofs: "builtin" | "fill",
    jsArgs?: "simple" | "faithful" | "full",
    externals?: string[]
  }

Compiler Configuration
======================

You can configure the Stopify compiler in several ways. Some of these options
only affect performance, whereas other options affect the sub-language of
JavaScript that the compiler targets.

Transformation (``.captureMethod``)
-----------------------------------

Stopify uses first-class continuations as a primitive to implement its
execution control features. Stopify can represent continuations in several
ways; the fastest approach depends on the application and the browser. The
valid options are ``"lazy"``, ``"retval"``, ``"eager"``, and ``"original"``.
For most cases, we recommend using ``"lazy"``.

Constructor Encoding (``.newMethod``)
-------------------------------------

Stopify implements two mechanisms to support suspending execution within the
dynamic extent of a constructor call.

- ``"wrapper"`` desugars all ``new`` expressions to ordinary function calls,
  using ``Object.create``.

- ``"direct"`` preserves ``new`` expressions, but instruments all functions to
  check if they are invoked as constructors, using ``new.target``.

The fastest approach depends on the browser. We recommend using ``wrapper``.

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


Implicit Operations (``.es``)
-----------------------------

Stopify can suspend execution within user-written ``valueOf()`` and
``toString()`` methods that JavaScript invokes implicitly.

For example, the following program is an infinite loop in JavaScript:

::

  var x = { toString: function() { while(true) { } } };
  x + 1;

With the implicit operations flag is set to ``"es5"``, Stopify will be able to
gracefully suspend the program above. With the flag set to ``"sane"``, Stopify
will not be able to detect the the infinite loop. We have found that most
source language compilers do not rely on implicit operations, thus it is
usually safe to use ``"sane"``.

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

Higher Order Functions (``.hofs``)
----------------------------------

Programs cannot use bulitin higher-order functions (e.g., ``.map``,
``.filter``, etc.) with Stopify, since Stopify cannot instrument native code.
The ``.hofs`` flag has two possible values:

- Use ``"builtin"`` if the program does not use any native higher-order
  functions.

- Use ``"fill"`` to have Stopify rewrite programs that use native higher-order
  functions to use polyfills written in JavaScript.

Getters and Setters (``.getters``)
----------------------------------

Programs that suspend execution within getters/setters incur a lot of overhead
with Stopify. The ``.getters`` flag has two possible values:

- Use ``true`` to have Stopify instrument the program to support suspension
  within getters and setters.

- Use ``false`` if the program does not use getters and setters.

Single-stepping and Breakpointing (``.debug``)
----------------------------------------------

Set ``.debug`` to ``true`` to enable support for single-stepping and
breakpointing. However, note that this requires more instrumentation and slows
the program down further.

