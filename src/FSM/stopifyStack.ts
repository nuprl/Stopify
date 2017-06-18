import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

import * as makeBlockStmt from '../common/makeBlockStmt';
import * as fsm from './fsm';

import { transform } from '../common/helpers';

export const stackStopifyPrint: stopifyPrint = (code: string) => {
  const plugins : any[] = [[fsm]];
  const transformed = transform(code, plugins);

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
  $onDone();
}
`
}

export const stackStopify: stopifyFunction = (code: string) => {
  return eval(`
(function () {
  return (${stackStopifyPrint(code)});
})()
`)
}
