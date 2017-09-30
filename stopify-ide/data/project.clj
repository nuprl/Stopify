(defproject lejure "0.1.0-SNAPSHOT"
  :description "Sample cljs project configuration"
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [org.clojure/clojurescript "1.9.521"]]
  :plugins [[lein-cljsbuild "1.1.6"]]
  :hooks [leiningen.cljsbuild]
  :source-paths ["src"]
  :clean-targets
  [[:cljsbuild :builds 0 :compiler :output-to]
   :target-path
   :compile-path]
  :profiles {:uberjar {:aot :all}}
  :cljsbuild {
              :builds [{:id "dev"
                        :jar true
                        :source-paths ["src"]
                        :incremental true
                        :compiler {
                                   :cache-analysis true
                                   :parallel-build true
                                   :optimizations :advanced
                                   :output-to "out/main.js"
                                   :output-dir "out"
                                   :static-fns true}}]})
