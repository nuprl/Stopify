import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

import * as desugarLoop from '../common/desugarLoop';

import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';

import { transform } from '../common/helpers';

const runtime: string = `
const R = require('${__dirname}/runtime');
`;

export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const plugins : any[] = [
    [desugarLoop, declVars],
    [label, jumper],
  ];
  const transformed: string = transform(code, plugins, opts)[0];

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${runtime}
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
