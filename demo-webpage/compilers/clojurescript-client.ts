import {ClojureScriptClient} from './compiler';

export let Cljs : ClojureScriptClient = {
  aceMode: 'ace/mode/clojure',
  defaultCode:
    `
(defn tail_sum [n acc]
  (println (str "acc: " acc))
  (if (= n 0)
    acc
    (tail_sum (- n 1) (+ acc n))))
(println (tail_sum 6 1))
    `,
  compileUrl: '/compile/cljs'
}
