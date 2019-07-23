=============
Release Notes
=============

Stopify 0.7.1
=============

- **Breaking change:** Stopify is now published as ``@stopify/stopify``. The
  other associated packages are also part of the ``@stopify`` namespace.

- **Breaking change**: The ``--hof`` flag to Stopify has been removed. However,
  the new package ``@stopify/higher-order-functions`` provides the same
  feature. See that package for details.

- **New package:** The package ``@stopify/normalize-js`` implements a
  semantics-preserving transformation for JavaScript that is inspired by
  A Normal Form. The code for this package was extracted from Stopify.

- **New package:** The package ``@stopify/continuations`` implements
  first-class continuations for JavaScript. The code for this package was
  extracted from Stopify.

- **Known issue:** The "deep stacks" feature of Stopify is broken (and has been
  for some time).

Stopify 0.6.0
=============
- **Breaking change:** Global variables must now be initialized onto the
  ``g`` field of the Stopify ``runner`` object. This removes the
  ``externals`` API from the ``AsyncRun`` interface. See the examples for how
  to update code to this new interface.

- **Breaking change:** The ``continueImmediate`` function requires a
  ``Result``. In previous releases, it would receive an ordinary value.
  This change allows external functions that pause stopified programs to
  resume with an exception.

  To upgrade old code, replace ``continueImmediate(x)`` with
  ``continueImmediate({ type: 'normal', value: x })``.

- **Breaking change:** The ``stopify-continuations`` package now only
  provides the runtime components for continuation support. The Babel
  continuation compiler backend now exists in a new package,
  ``stopify-continuations-compiler``.

  Code that only depends upon the ``stopify`` package directly does not need
  to be updated.

- Added the ``catch`` transform to the compiler. From experiments, ``catch``
  often outperforms ``lazy`` and other transforms.

- Added the ``eval2`` compiler flag. This new mode supports evaluating new
  code in the same global environment as the main program.

- Estimator implementations have been migrated to a separate
  ``stopify-estimators`` package.

- Along with the ``stopify-estimators`` package, a new ``interrupt``
  estimator is introduced for Node.js programs, using a C++ extension to
  Node.js to initialize a timer.

- Fixed several issues with breakpoints. See https://github.com/plasma-umass/Stopify/issues/424.

Stopify 0.5.0
=============

- **Breaking change:** The ``onDone`` callback passed to ``AsyncRun.run``
  always receives a ``Result``. In previous releases, it would receive an
  optional error argument.

- Stopify now reports a stack trace when an an exception occurs in stopified
  code. However, stack traces only work with ``captureMethod: lazy`` (the
  default capture method).

- Setting the ``debug`` flag would crash the online compiler. This is now
  fixed.

Stopify 0.4.0
=============

- Added an optional error argument to the ``onDone`` callback of ``AsyncRun``.
  When the argument is present, it indicates that the stopified program threw
  an exception with the given error.

Stopify 0.3.0
=============

- Cleanup and documented Stopify's Node API.

- Stopify can now execute blocking operations at the top-level. For example,
  the following program now works:

  .. code-block:: javascript

    function sleep(duration) {
      asyncRun.pauseImmediate(() => {
        window.setTimeout(() => asyncRun.continueImmediate(undefined), duration);
      });
    }

    const asyncRun = stopify.stopifyLocally(`sleep(1000)`,
      { externals: [ 'sleep' ] }));
    asyncRun.run(() => { });

  In previous versions of Stopify, this program would have raised an error.

  You could effective run this program by wrapping the blocking operation
  in a thunk, i.e., ``function() { sleep(1000); }()``. However, this
  wrapping is now unnecessary.

- **Potentially breaking change:** Top-level variables declared within Stopify
  no longer leak into the global scope of the page. In previous versions
  of Stopify, top-level variables would leak as follows:

  .. code-block:: javascript

    const asyncRun = stopify.stopifyLocally(`var x = 100;`);
    asyncRun.run(() => { 
      console.log(x); // prints 100
    });

  This is no longer the case. However, this may break programs that relied on
  this behavior.

Stopify 0.2.1
=============

- Fixed a bug introduced in release 0.2.0, where ``stopifyLocally`` would fail
  if run more than once.

Stopify 0.2.0
=============

- Exposed the ``velocity`` estimator and set it as the default instead of
  ``reservoir``. In our experiments, ``velocity`` performs better and has
  negligible overhead.

- Added the ``.stackSize`` and ``.restoreFrames`` runtime options, which allow
  Stopify to simulate an arbitrarily deep stack.

- Fixed a bug where programs that used ``return`` or ``throw`` in the
  ``default:`` case of a ``switch`` statement would not resume correctly.

- Added the ``processEvent`` function to the Stopify API.

Stopify 0.1.0
=============

- Initial release
