import { stopifyFunction, stopifyPrint } from './stopifyStandaloneInterface';

import * as makeBlockStmt from '../makeBlockStmt';
import * as fsm from '../fsm';

import { transform } from '../helpers';

export const stackStopifyPrint: stopifyPrint = (code) => {
  const plugins : any[] = [[fsm]];
  const transformed = transform(code, plugins);

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
  $onDone();
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
