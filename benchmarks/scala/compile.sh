#!/bin/bash
set -e

SOURCEFILE=$1
WORKSPACE=`mktemp -d`

function cleanup {
    rm -rf $WORKSPACE
}

trap cleanup EXIT

mkdir -p $WORKSPACE/project

echo 'addSbtPlugin("org.scala-js" % "sbt-scalajs" % "0.6.15")' > $WORKSPACE/project/plugins.sbt

cat > $WORKSPACE/build.sbt <<EOF
enablePlugins(ScalaJSPlugin)

scalaVersion in ThisBuild := "2.12.1"
name := "MyScalaProgram"

scalaJSUseMainModuleInitializer := true
EOF

cp $SOURCEFILE $WORKSPACE/Main.scala

(cd $WORKSPACE; sbt fastOptJS 1>&2; cat target/scala-2.12/myscalaprogram-fastopt.js)
