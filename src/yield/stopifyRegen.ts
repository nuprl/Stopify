import * as stopifyYield from './stopifyYield';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'
export const regenStopifyPrint: stopifyPrint = (code: string) => {

  const inter = stopifyYield.yieldStopifyPrint(code)
  const intermediate = `(${inter})($isStop, $onStop, $onDone, $interval)`

  const transformed = require('regenerator').compile(intermediate, {
    includeRuntime: true
  }).code;

  return `function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
}`
}

export const regenStopify: stopifyFunction = (code) => {
  return eval(`
    (function() {
      return (${regenStopifyPrint(code)});
    })()
  `)
}
