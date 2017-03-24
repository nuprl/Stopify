# Stopify [![Build Status](https://travis-ci.com/plasma-umass/Stopify.svg?token=deQs2QJESqvhzMgbFBFz&branch=master)](https://travis-ci.com/plasma-umass/Stopify)
## Dependencies
1. Install the latest version of node.
2. To install the dependecies, run `npm install` in the root of the project.
3. (optional) Run `npm install -g babel-cli` for a global installation of babel. If you skip this step, use `./node_modules/.bin/babel` instead of `babel` in all the following commands.

## Testing
### Test Suite
* Run the test suite using `npm test`.

### Compiling a single file
* To compile a file, run `babel <filename>`.
* Additionally, to use a subset of plugins, run `babel --no-babelrc --plugins=<comma-sep list of plugins> <filename>`

### Adding tests
* Tests are defined inside the `tests/should-compile` and `tests/should-run` folders. Write a single JS test file in either of these folder to add it as a test.

## Linting
* To lint the src file run `npm run lint` and for all file (including tests) run `npm run lintall`.
* To automatically fix the style errors in src files, run `npm run fix` and for all files, `npm run fixall`.

## Resources
AST explorer for JS (select babylon as the parser): [[astexplorer.net](astexplorer.net)]
