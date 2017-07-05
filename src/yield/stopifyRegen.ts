import * as stopifyYield from './stopifyYield';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'
import { Options } from '../common/helpers'

const includeRuntime = `const $compile_string = require('${__dirname}/stopifyRegen').regenStopifyEval`

export const regenStopifyPrint: stopifyPrint = (code: string, opts: Options) => {
  const transformedData = stopifyYield.yieldStopifyRegen(code, opts)
  const intermediate = transformedData[0]

  const transformed: string = require('regenerator').compile(intermediate, {
    includeRuntime: true
  }).code;

  return `function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformedData[1] ? includeRuntime.toString() : ""}
  ${transformed}
}`
}

export function regenStopifyEval(code: string): string {
  const intermediate = stopifyYield.yieldEvalString(code)
  const transformed: string = require('regenerator').compile(intermediate, {
  }).code;
  console.log(transformed)
  return transformed
}

export const regenStopify: stopifyFunction = (code, opts) => {
  return eval(`
    (function() {
      return (${regenStopifyPrint(code, opts)});
    })()
  `)
}
