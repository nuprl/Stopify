## Stopify [![Build Status](https://travis-ci.org/plasma-umass/Stopify.svg?branch=master)](https://travis-ci.org/plasma-umass/Stopify)

Web-based programming environments lack many basic features that programmers
expect to find in desktop-based IDEs. For example, given a non-terminating
program, many environments simply crash the browser. Some environments implement
"infinite loop detectors", but these sacrifice the ability to execute
long-running, interactive programs. The few exceptions that handle this
correctly, such as Pyret and WeScheme, have required tremendous effort to build
and are tightly coupled to specific programming languages.

We present Stopify, a new approach to building web-based programming
environments, that supports any language that compiles to JavaScript and
generates source maps. Stopify transforms the JavaScript produced by an ordinary
compiler and implements a runtime scheduler that adds support for pausing,
resuming, stepping, and break-pointing at the source language level.

## Dependencies
1. Install the latest version of node.
2. To install the dependecies, run `npm install` in the root of the project.
3. (optional) Run `npm install -g typescript` for a global installation of the
   typescript compiler.
### Optional Server Dependencies
1. For OCaml support
 - `npm install -g bs-platform`
2. For ClojureScript support
 - `brew install leiningen`
3. For ScalaJS, install [scala](https://www.scala-lang.org/download/) and
   [sbt](http://www.scala-sbt.org/0.13/docs/Setup.html)

## Program Transformation Plugins
Stopify includes a collection of `babel` plugins for transforming JavaScript
code to yield computation to event listeners. These transformations enable
language-level debugging abstractions (e.g. pausing, resuming, and stepping
through a running program).

### Building
1. `npm run build`

### Running
The build produces the stopify executable in `<project-root>/built/`.
Run the following to see the options:
- `<projec-root>$ ./built/stopify.js --help`

## Paws Server
Stopify also includes a server backend to support debugging multiple source
languages within a web browser. Running the `paws-server` requires optional
server dependencies to be installed.
### Building
1. `npm run build-webpage`

### Running
 - `<project-root>$ ./paws-server.sh`
 - Navigate to `localhost:8080` in your browser.
