import { ScalaJSClientInterface } from './compiler';

export let ScalaJS : ScalaJSClientInterface = {
  aceMode: 'scala',
  defaultCode:
  `
import scala.scalajs.js.JSApp

object Runner extends JSApp {
  def sum(n: Int, acc: Int): Int = {
    println("acc:" + acc)
    if (n == 0) acc
    else sum(n-1, acc+n)
  }

  def main(): Unit = {
    println(sum(1000000, 0))
  }
}
  `,
  compileUrl: './compile/scala'
}
