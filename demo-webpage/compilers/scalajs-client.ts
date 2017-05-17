import { ScalaJSClientInterface } from './compiler';

export let ScalaJS : ScalaJSClientInterface = {
  aceMode: 'ace/mode/scala',
  defaultCode:
  `
  object Runner {
    def sum(n: Int, acc: Int): Int = {
      println("acc:" + acc)
      if (n == 0) acc
      else sum(n-1, acc+n)
    }

    def main(args: Array[String]): Unit = {
      println(sum(1000000, 0))
    }
  }
  `,
  compileUrl: './compile/scala'
}
