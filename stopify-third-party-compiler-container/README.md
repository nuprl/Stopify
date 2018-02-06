Stopify: third-party compiler container
=======================================

This container provides a web server that can compile several languages to
JavaScript. To do so, it uses a variety of third-party compilers.

Building
--------

You can pull a pre-built container from Docker Hub:

    docker pull arjunguha/stopify-third-party-compilers

Alternatively, you can build the container yourself:

    make

Starting
--------

The container exposes a web server on port 8080. You can start it as follows:

    docker run --name stopify-third-party-compilers -p 8080:8080 -d arjunguha/stopify-third-party-compilers

Usage
-----

  curl -X POST -data-binary @FILENAME localhost:8080/LANGUAGE > FILENAME.js

See the file `server/ts/server.ts` for a list of supported languages.

Notes
-----

I have tried to run this container as an OpenWhisk action, but it has not
worked. It may be the case that it is too large for BlueMix. Feel free to
experiment. You will need to define an `/init` handler and prefix
all compile actions with `/run`