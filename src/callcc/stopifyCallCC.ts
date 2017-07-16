import * as callcc from './callcc';
import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';
import * as babel from 'babel-core';



export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const transformOpts = { plugins: [callcc], babelrc: false };
  const { code: transformed } = babel.transform(code, transformOpts);

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
