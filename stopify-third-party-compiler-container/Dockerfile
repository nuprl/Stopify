FROM ubuntu:14.04
MAINTAINER Arjun Guha <arjun@cs.umass.edu>
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq
RUN apt-get install -yq software-properties-common curl apt-transport-https
RUN add-apt-repository -y ppa:webupd8team/java

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
RUN curl -s https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN curl -s https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_stable.list > /etc/apt/sources.list.d/dart_stable.list
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -

RUN echo debconf shared/accepted-oracle-license-v1-1 select true | debconf-set-selections

RUN apt-get install -yq nodejs \
  oracle-java8-installer \
  build-essential \
  cmake \
  yarn \
  python-pip \
  git \
  dart \
  clang

# Install BuckleScript
RUN yarn global add bs-platform

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

# Install Emscripten
RUN curl -s https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz > emsdk-portable.tar.gz
RUN tar xzf emsdk-portable.tar.gz
RUN rm emsdk-portable.tar.gz
WORKDIR /emsdk-portable
RUN ./emsdk update
RUN ./emsdk install sdk-1.37.22-64bit
RUN ./emsdk activate sdk-1.37.22-64bit
RUN echo "source /emsdk-portable/emsdk_env.sh" >> /root/.bash_profile
WORKDIR /

# Install Scalajs
RUN curl -s https://downloads.lightbend.com/scala/2.12.4/scala-2.12.4.deb > /scala-2.12.4.deb
RUN curl -s https://www.scala-js.org/files/scalajs_2.12-0.6.22.tgz | tar xz
RUN dpkg -i /scala-2.12.4.deb
RUN rm /scala-2.12.4.deb
RUN mv /scalajs_2.12-0.6.22/bin/* /usr/local/bin
RUN mv /scalajs_2.12-0.6.22/lib/* /usr/local/lib
RUN rm -rf /scalajs_2.12-0.6.22

RUN yarn global add browserify

# Install the compiler server
COPY /server /server
WORKDIR /server
RUN yarn install
RUN yarn run build


EXPOSE 8080
ENTRYPOINT bash -c "echo $PATH; cd /server && yarn run serve"