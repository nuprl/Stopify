=====================
Illustrative Examples
=====================

This chapter presents several examples that showcase Stopify's features.

A Blocking ``sleep`` Function
=============================

The browser does not have a blocking ``sleep`` function.  However, we can use
``window.setTimeout`` and Stopify to simulate a blocking ``sleep`` operation:

.. code-block:: javascript

  function sleep(duration) {
    asyncRun.pauseImmediate(() => {
      window.setTimeout(() => asyncRun.continueImmediate(undefined), duration);
    });
  }

In the code above, ``asyncRun`` is an instance of ``AsyncRun``
(:ref:`asyncrun`). Note that this function should be stopified itself and needs
to be declared as an external. A complete example of a page that uses ``sleep``
is shown below.

.. literalinclude:: examples/sleep.html
  :language: html

This program runs forever and prints a period each second.

A Blocking ``prompt`` Function
==============================

The ``prompt`` and ``alert`` functions that are built-in to browsers are not
the ideal way to receive input from the user. First, modal dialog boxes are
unattractive; second, a user can dismiss them; and finally, if a page displays
too many modal dialog boxes, the browser can give the user to suppress all of
them.

.. literalinclude:: examples/prompt.html
  :language: html

This program prompts the user for two inputs without modal dialog boxes.

