import * as stopifyYield from './stopifyYield';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'

export const regenStopifyPrint: stopifyPrint = (code: string) => {
  const transformedData = stopifyYield.yieldStopifyRegen(code)
  const intermediate = transformedData[0]

  const transformed: string = require('regenerator').compile(intermediate, {
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
