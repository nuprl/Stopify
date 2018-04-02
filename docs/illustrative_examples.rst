=====================
Illustrative Examples
=====================

This chapter presents several examples that showcase Stopify's features.

A Blocking ``sleep`` Function
=============================

The browser does not have a blocking ``sleep`` function.  However, we can use
``window.setTimeout`` and Stopify to simulate a blocking ``sleep`` operation:

::

  function sleep(duration) {
    asyncRun.pauseImmediate(() => {
      window.setTimeout(() => asyncRun.continueImmediate(undefined), duration);
    });
  }

In the code above, ``asyncRun`` is an instance of ``AsyncRun``
(REF). Note that this function should be stopified itself and needs
to be declared as an external. REF shows a complete example
of a page that uses ``sleep``.

\begin{figure}
\lstinputlisting{examples/sleep.html}
\caption{This program runs forever and prints a period each second.}
\label{sleep-complete}
\end{figure}

A Blocking ``prompt`` Function
==============================

\begin{figure}
\lstinputlisting{examples/prompt.html}
\caption{This program prompts the user for two inputs without modal dialog boxes.}
\label{prompt-complete}
\end{figure}

The ``prompt`` and ``alert`` functions that are built-in to
browsers are not the ideal way to receive input from the user. First, modal
dialog boxes are unattractive; second, a user can dismiss them; and finally, if
a page displays too many modal dialog boxes, the browser can give the user to
suppress all of them (REF).
