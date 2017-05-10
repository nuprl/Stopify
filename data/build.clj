(require 'cljs.build.api)

(cljs.build.api/build "src"
                      {:main 'cljs.code
                       :output-to "out/main.js"})
