import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

export const shamStopifyPrint: stopifyPrint = (code, opts) => {
  return `
  function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
    ${code}
    $onDone();
  }
  `
}

export const shamStopify: stopifyFunction = (code, opts) => {
  return eval(`
    (function () {
      return (${shamStopifyPrint(code, opts)});
    })()
  `)
}
