## Stopify [![Build Status](https://travis-ci.org/plasma-umass/Stopify.svg?branch=master)](https://travis-ci.org/plasma-umass/Stopify)

# Dependencies
1. Install the latest version of node.
2. To install the dependecies, run `npm install` in the root of the project.
3. (optional) Run `npm install -g typescript` for a global installation of the
   typescript compiler.
## Optional Server Dependencies
1. For OCaml support
 - `npm install -g bs-platform`
2. For ClojureScript support
 - `brew install leiningen`
 - `brew install closure-compiler`

# Program Transformation Plugins
Stopify includes a collection of `babel` plugins for transforming JavaScript
code to yield computation to event listeners. These transformations enable
language-level debugging abstractions (e.g. pausing, resuming, and stepping
through a running program).

## Building
1. `npm run build`

## Running 
The build produces executable javascript files in `<project-root>/built/`.
Transformations can be run with the following:
 - `<project-root>/built$ ./stopify.js -i <test-file> -t <cps | yield |
   regenerator> -o <eval | print>`

# Paws Server
Stopify also includes a server backend to support debugging multiple source
languages within a web browser. Running the `paws-server` requires optional
server dependencies to be installed.

## Building
1. `npm run build`

## Running
 - `<project-root>$ ./paws-server.sh`
 - Navigate to `localhost:8080` in your browser.

# Testing
## Test Suite
 - `npm run build`.
 - `npm test`.

## Adding tests
* Tests are defined inside the `tests/should-run` folder. Writing a single JS
  test file in this folder to add it as a test.

# Resources
AST explorer for JS (select babylon as the parser): [[astexplorer.net](astexplorer.net)]
