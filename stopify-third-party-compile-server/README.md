Prerequisites
============

1. PyJS:

```
sudo apt install python-pip
sudo pip install git+https://github.com/pyjs/pyjs.git#egg=pyjs
```

2. Emscripten:

http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html

3. BuckleScript:

```
npm install -g bs-platform
npm install -g browserify
```

I had a lot of issues with permissions installing bs-platform.

4. JDK (for Sacla and Clojure)

```
sudo apt-get install openjdk-8-jdk
```

5. http://www.scala-sbt.org/1.0/docs/Installing-sbt-on-Linux.html

Building
========

```
yarn run build
```

Publishing
==========

```
npm publish
````

Deploying
=========

```
sudo npm install -g @plasma-umass/stopify-third-party-compile-server
stopify-third-party-compile-server 8080
```
