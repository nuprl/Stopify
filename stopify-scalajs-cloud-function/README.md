This package contains a "Google Cloud Function" that compiles Scala to
JavaScript using ScalaJS.

Building
--------

1. Run `yarn install` to install Node dependencies.

2. Download the [Java JRE for Linux], [ScalaJS standalone], and
   [Scala for OS X / UNIX / Cygwin]. Ensure that the ScalaJS version matches
   the version of Scala.

3. Extract the downloaded packages above into `./dist`.  i.e., all binaries
   should be in `./dist/bin`.

4. `yarn run build` to compile

5. `yarn run deploy` to deploy

Interface
---------

To compile a Scala program, send an HTTP request with Scala code as the
body. On success, the response is JavaScript. For example:

```
curl -X POST --data-binary @Filename.scala -H 'Content-Type: text/plain' https://us-central1-arjun-umass.cloudfunctions.net/stopifyCompileScalaJS
```

[Java JRE for Linux]: http://www.oracle.com/technetwork/java/javase/downloads/server-jre8-downloads-2133154.html
[ScalaJS standalone]: https://www.scala-js.org/doc/internals/downloads.html
[Scala for OS X / UNIX / Cygwin]: https://www.scala-lang.org/download/