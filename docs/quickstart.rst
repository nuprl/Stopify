===========
Quick Start
===========

This section guides you through installing Stopify and applying it to a simple
JavaScript program that runs forever and periodically prints the current time.
However, since the program never yields control to the browser's event loop
(e.g., using ``setTimeout``), nothing will appear on the page and the browser
tab will eventually crash. Stopify will make this program behave more naturally
and actually show the output.

Instructions
------------

1. Install the Stopify executable using NPM (or Yarn):

.. code-block:: bash

  npm install -g stopify

2. Save the following program to the file ``input.js``.

.. _trivial-periodic:

.. code-block:: javascript

  const elt = document.createElement("div");
  document.body.appendChild(elt);

  var i = 0;
  var j = 0;
  while (true) {
    if (i++ == 10000000) {
      j++;
      elt.innerText = "Still running ... " + (new Date());
      i = 0;
    }
  }

This program will make any web browser crash.

3. Use the Stopify compiler to stopify the program:

.. code-block:: bash

  stopify input.js output.js

4. The Stopify installation includes a copy of the Stopify runtime system
   (``stopify.bundle.js``). Look up the path using the following command:

.. code-block:: bash

  stopify-path stopify.bundle.js

5. Create a simple web page that first loads the Stopify runtime system (i.e.,
   the path produced in the previous step) and then uses the runtime system to
   load the saved file. An example is given below.

.. code-block:: html

  <html>
    <body>
      <script src="stopify.bundle.js"></script>
      <script>
      var runner = stopify.stopify("output.js");
      runner.g = { console, document, Date }; 
      runner.run(() => console.log("done"));
      </script>
    </body>
  </html>

Testing
-------

Finally, open the page in any browser. You'll find that the program "just
works" and periodically prints the current time. In contrast, if you load
``input.js`` directly, it will not print anything and will eventually crash the
browser tab.
