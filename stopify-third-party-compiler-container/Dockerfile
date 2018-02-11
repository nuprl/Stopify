FROM ubuntu:16.04
MAINTAINER Arjun Guha <arjun@cs.umass.edu>
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq
RUN apt-get install -yq software-properties-common curl apt-transport-https
RUN add-apt-repository -y ppa:webupd8team/java

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN curl -s https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN curl -s https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_stable.list > /etc/apt/sources.list.d/dart_stable.list
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -

RUN echo debconf shared/accepted-oracle-license-v1-1 select true | debconf-set-selections

RUN apt-get install -yq nodejs \
  oracle-java8-installer \
  build-essential \
  cmake \
  yarn \
  python-pip \
  git \
  dart

# Install ClojureScript
RUN curl -s https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein > /usr/local/bin/lein
RUN chmod a+x /usr/local/bin/lein
RUN mkdir -p /tmp-clojure/src/paws
COPY /project.clj /tmp-clojure
COPY /code.cljs /tmp-clojure/src/paws/code.cljs
WORKDIR /tmp-clojure
RUN lein cljsbuild once
RUN rm -rf /tmp-clojure
WORKDIR /

# Install PyJS
RUN curl -s https://storage.googleapis.com/stopify/pyjs_prelude.js > /root/pyjs_prelude.js
RUN pip install git+https://github.com/pyjs/pyjs.git#egg=pyjs

# Install Scalajs
RUN curl -s https://downloads.lightbend.com/scala/2.12.4/scala-2.12.4.deb > /scala-2.12.4.deb
RUN curl -s https://www.scala-js.org/files/scalajs_2.12-0.6.22.tgz | tar xz
RUN dpkg -i /scala-2.12.4.deb
RUN rm /scala-2.12.4.deb
RUN mv /scalajs_2.12-0.6.22/bin/* /usr/local/bin
RUN mv /scalajs_2.12-0.6.22/lib/* /usr/local/lib
RUN rm -rf /scalajs_2.12-0.6.22

# Paths for Emscripten and BuckleScript
ENV PATH /bin:/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/emsdk-portable:/emsdk-portable/clang/e1.37.22_64bit:/emsdk-portable/emscripten/1.37.22:/root/.npm-global/bin

# Install Emscripten
RUN curl -s https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz > emsdk-portable.tar.gz
RUN tar xzf emsdk-portable.tar.gz
RUN rm emsdk-portable.tar.gz
WORKDIR /emsdk-portable
RUN ./emsdk update
RUN ./emsdk install sdk-1.37.22-64bit
RUN ./emsdk activate sdk-1.37.22-64bit
ENV EMSDK /emsdk-portable
ENV BINARYEN_ROOT /emsdk-portable/clang/e1.37.22_64bit/binaryen
ENV EMSCRIPTEN /emsdk-portable/emscripten/1.37.22
run mkdir /emcc-init
COPY /server/resources/emscripten/Makefile /emcc-init/Makefile
COPY /init.cpp /emcc-init/main.cpp
WORKDIR /emcc-init
RUN make
WORKDIR /
RUN rm -rf /emcc-init

# Install BuckleScript
RUN mkdir /root/.npm-global
RUN npm config set prefix '/root/.npm-global'
RUN npm add -g --unsafe-perm bs-platform
RUN npm add -g browserify

# Install the compiler server
COPY /server /server
WORKDIR /server
RUN yarn install
RUN yarn run build
WORKDIR /

EXPOSE 8080
WORKDIR /server
CMD yarn run serve