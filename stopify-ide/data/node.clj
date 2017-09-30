(require 'cljs.build.api)

(cljs.build.api/build "src"
  {:main 'hello
   :output-to "main.js"
   :target :nodejs})
