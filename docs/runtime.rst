.. _
.. _runtime:

==============
Runtime System
==============

.. _
.. _runtime-config:

Runtime Configuration
=====================

The Stopify runtime system takes a dictionary of options with the following
type:

.. code-block:: typescript

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

.. _estimator:

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

.. _asyncrun:

The ``AsyncRun`` Interface
==========================

.. code-block:: typescript

  interface NormalResult {
    type: 'normal';
    value: any;
  }

  interface ExceptionResult {
    type: 'exception';
    value: any;
    stack: string[]
  };

  type Result = NormalResult | ExceptionResult;

  interface AsyncRun {
    run(onDone: (result: Result) => void,
        onYield?: () => void,
        onBreakpoint?: (line: number) => void): void;
    pause(onPaused: (line?: number) => void): void;
    resume(): void;
    setBreakpoints(line: number[]): void;
    step(onStep: (line: number) => void): void;
    pauseImmediate(callback: () => void): void;
    continueImmediate(result: Result): void;
    processEvent(body: () => any, receiver: (x: Result) => void): void;
  }

The ``AsyncRun`` interface provides methods to run, stop, and control the
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

:doc:`illustrative_examples` has several examples that use these methods to implement simulated blocking
operations.

Finally, the ``processEvent(f, onDone)`` method allows external event-handlers
to call a stopified function ``f``. Since ``f`` may pause execution and thus
not return immediately, Stopify passes its result to the ``onDone`` callback,
which must not be a stopified function.
