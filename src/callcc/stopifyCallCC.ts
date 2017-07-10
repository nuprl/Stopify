import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

import * as callCC from './callCC';

import { transform } from '../common/helpers';

export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const plugins : any[] = [
    [callCC],
  ];
  const transformed: string = transform(code, plugins, opts)[0];

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
  $onDone();
}
`
}

export const callCCStopify: stopifyFunction = (code, opts) => {
  return eval(`
(function () {
  return (${callCCStopifyPrint(code, opts)});
})()
`)
}
