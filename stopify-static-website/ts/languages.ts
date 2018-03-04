import * as stopifyCompiler from 'stopify';

export interface Language {
  compileUrl: string,
  defaultCode: string
  aceMode: string,
  stepSupported: boolean
}

const compilerBase = 'https://us-central1-arjun-umass.cloudfunctions.net/stopify';

export function runtimeOpts(name: string): stopifyCompiler.Opts {
  if (name === 'pyjs' || name === 'js') {
    return {
      filename: '',
      estimator: 'reservoir',
      yieldInterval: 100,
      timePerElapsed: 1,
      resampleInterval: 1,
      variance: false,
      env: 'chrome',
      stop: undefined
    };
  }

  return {
    filename: '',
    estimator: 'countdown',
    yieldInterval: 1,
    timePerElapsed: 1,
    resampleInterval: 1,
    variance: false,
    env: 'chrome',
    stop: undefined
  };
}

export const langs: { [name: string]: Language } = {
  'Dart': {
    stepSupported: false,
    compileUrl: `${compilerBase}/dart2js`,
    aceMode: 'dart',
    defaultCode: `
void main() {
  for (int i = 0; i < 10000000; i++) {
    print('hello \${i + 1}');
  }
}`
  },
  'Clojure': {
    stepSupported: true,
    compileUrl: `${compilerBase}/clojurescript`,
    aceMode: 'clojure',
		defaultCode:`(defn tail_sum [n acc]
  (println (str "acc: " acc))
  (if (= n 0)
    acc
    (tail_sum (- n 1) (+ acc n))))
(println (tail_sum 1000000 1))`,
  },
  'C++': {
    stepSupported: true,
    compileUrl: `${compilerBase}/emscripten`,
    aceMode: 'c_cpp',
    defaultCode:
      `#include <stdio.h>

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
    defaultCode:
      `let rec tail_sum n acc =
print_endline ("acc: " ^ (string_of_int acc));
if n = 0 then acc else tail_sum (n - 1) (acc + n)

let _ = tail_sum 1000000 1`,
    compileUrl: `${compilerBase}/bucklescript`
  },
  'Scala': {
    stepSupported: true,
    aceMode: 'scala',
    defaultCode:
    `import scala.scalajs.js.JSApp

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
    compileUrl: `${compilerBase}/scalajs`
  },
  Python: {
    stepSupported: false,
    aceMode: 'python',
    defaultCode:
    `def fib(n):
  print "fib(" + str(n) + ")"
  if n == 0 or n == 1:
    return 1
  return fib(n-1) + fib(n-2)

print (fib(15))`,
    compileUrl: `${compilerBase}/pyjs-fast`
  },
  JavaScript: {
    stepSupported: true,
    aceMode: 'js',
    defaultCode:
    `function fib(n) {
  console.log('fib(' + n + ')');
  if (n === 0 || n === 1) {
    return 1;
  }
  return fib(n-1) + fib(n-2);
}

fib(15);`,
    compileUrl: `${compilerBase}/js`
  },
};
