## Stopify [![Build Status](http://23.20.114.147:5000/buildStatus/icon?job=stopify-build/master)](http://23.20.114.147:5000/job/stopify-build/job/master/)

## Installation
1. Install the latest version of `node` and `yarn` (install using `npm install -g yarn`).
2. To install the dependecies, run `yarn` in the root of the project.
3. Run `npm run build` to build the project.
4. Run tests using `npm test`.

### Running in the terminal
Stopify supports mutliple stack-saving strategies. Compile a JavaScript file by navigating the project root and:
1. Run `./bin/compile -t <lazy|eager|retval|original|fudge> <intput> <output>`.
2. To run the compiled file, use `./bin/run <input> [opts]`. Available options:
    * `-y | --yield <interval>`: yield interval in ms.
    * `-e | --env <chrome|firefox|node>`: For CLI, only `node` is a valid option.
    * `--variance`: Measure variance.
    * `--time-per-elapsed`: Estimate to the internal b/w internal suspend calls.
    * `--stop`: Time (in ms) after which program should be stopped.
    * `--estimator <exact|countdown|resevoir`


### Running in the browser
To run a compiled the program in the browser:
1. Run `./bin/compile -t <lazy|eager|retval|original|fudge> <intput> <output>`.
2. Run the compiled program through webpack using `./bin/webpack <input.js> <output.html>`
3. Open the output html file in a browser to the run program. **NOTE**: In case the page doesn't seem to be doing anything, check the console through dev tools.
4. Alternatively, to use selenium runner provided with Stopify:
   a. Install either [Chromedriver](http://chromedriver.storage.googleapis.com/2.30/chromedriver_linux64.zip) and [Geckodriver](https://github.com/mozilla/geckodriver/releases/download/v0.18.0/geckodriver-v0.18.0-linux64.tar.gz).
   b. Run the program using `./bin/browser <out.html> -e <chrome|firefox> [opts]`. The opts are the same as the CLI options.

## Stopify with Webpack

Stopify is a Babel plugin thus can be used with [babel-loader]. In a new
project:

1. Add packages `yarn add babel-cli babel-loader webpack`.
2. Add Stopify: `ln -s <local-stopify> node_modules/Stopify`
3. Create `webpack.config.js` with the following contents:

```
module.exports = {
  entry: <entrypoint-of-web-app>,
  output: {
    filename: './dist/bundle.js'
  },
  externals: {
    "Stopify": 'stopify'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(Stopify|node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
              plugins: ['Stopify']
          }
        }
      }
    ]
  }
};
```

Notice that the configuration declares the Stopify module as an external.
the HTML for the web app should load `Stopify/built/stopify.bundle.js` before
the created `dist/bundle.js`.

## Paws Server
**TODO**(rachit): Update when paws server is functional again.


[babel-loader]: https://github.com/babel/babel-loader
