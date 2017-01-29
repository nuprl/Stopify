### Building and Testing
----------------
#### Dependencies
1. Install the latest version of node.
2. To install the dependecies, run `npm install` in the root of the project.
3. Install the test-runner globally using `npm install -g jest` or use the local bin in `./node_modules/.bin/jest`.

#### Testing
* Run the test suite using `jest` (for global installation of jest) or `./node_modules/.bin/jest` (for local installation of jest).

* To transform a javascript file using the plugin, run `./src/run.js <filename>`. The the path for the 
interpreter (node) might need to be changed inside `scr/run.js` depending on the installation path.

#### Linting
* To lint the src file run `npm run lint` and for all file (including tests) run `npm run lintall`.
* To automatically fix the style errors in src files, run `npm run fix` and for all files, `npm run fixall`.
