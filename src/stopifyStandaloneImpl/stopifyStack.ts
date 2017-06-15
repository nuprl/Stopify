import { stopifyFunction, stopifyPrint } from './stopifyStandaloneInterface';

import { transform } from '../helpers';

export const stackStopifyPrint: stopifyPrint = (code) => {
  const plugins : any[] = [];
  const transformed = transform(code, plugins);

  if(transformed.length < code.length) {
    throw new Error('Transformed code is smaller than original code');
  }

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
}
`
}

export const stackStopify: stopifyFunction = (code) => {
  return eval(`
(function () {
  return (${stackStopifyPrint(code)});
})()
`)
}
