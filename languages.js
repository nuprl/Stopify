"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.langs = {
    'ClojureScript': {
        stepSupported: true,
        compileUrl: 'https://us-central1-arjun-umass.cloudfunctions.net/stopify/clojurescript',
        aceMode: 'clojure',
        defaultCode: `(defn tail_sum [n acc]
  (println (str "acc: " acc))
  (if (= n 0)
    acc
    (tail_sum (- n 1) (+ acc n))))
(println (tail_sum 1000000 1))`,
    },
    'Cpp': {
        stepSupported: true,
        compileUrl: 'https://us-central1-arjun-umass.cloudfunctions.net/stopify/emscripten',
        aceMode: 'c_cpp',
        defaultCode: `#include <stdio.h>

int sum(int n) {
  auto sum = 0;
  for (int i = 0; i < n; i++) {
    sum += i;
    printf("acc: %d\\n", sum);
  }

  return sum;
}

int main() {
  printf("Sum: %d\\n", sum(1000000));
}`
    },
    'OCaml': {
        stepSupported: false,
        aceMode: 'ocaml',
        defaultCode: `let rec tail_sum n acc =
print_endline ("acc: " ^ (string_of_int acc));
if n = 0 then acc else tail_sum (n - 1) (acc + n)

let _ = tail_sum 1000000 1`,
        compileUrl: 'https://us-central1-arjun-umass.cloudfunctions.net/stopify/bucklescript'
    },
    ScalaJS: {
        stepSupported: true,
        aceMode: 'scala',
        defaultCode: `import scala.scalajs.js.JSApp

object Runner extends JSApp {
  def sum(n: Int, acc: Int): Int = {
    println("acc:" + acc)
    if (n == 0) acc
    else sum(n-1, acc+n)
  }

  def main(): Unit = {
    println(sum(1000000, 0))
  }
}`,
        compileUrl: 'https://us-central1-arjun-umass.cloudfunctions.net/stopify/scalajs'
    },
    Python: {
        stepSupported: false,
        aceMode: 'python',
        defaultCode: `def run_forever():
    i = 0
    while(True):
        if i > 10000:
            i = 0
        i += 1
        print i

run_forever()
    `,
        compileUrl: 'https://us-central1-arjun-umass.cloudfunctions.net/stopify/pyjs'
    }
};
//# sourceMappingURL=languages.js.map