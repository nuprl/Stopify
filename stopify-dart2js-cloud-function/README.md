This package contains a "Google Cloud Function" that compiles Scala to
JavaScript using ScalaJS.

Building
--------

1. Run `yarn install` to install Node dependencies.

2. Install the Dart SDK for Linux. Copy `/usr/lib/dart` to `./dist`. i.e.,
   `./dist/bin/dartjs` should be the compiler. You can delete the `.snapshot`
   files for the other tools to save some space.

4. `yarn run build` to compile

5. `yarn run deploy` to deploy

Interface
---------

To compile a program, send an HTTP request with the code as the body. On
success, the response is JavaScript. For example:

```
curl -X POST --data-binary @Filename.dart -H 'Content-Type: text/plain' https://us-central1-arjun-umass.cloudfunctions.net/stopifyCompileDart2JS
```
