import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

import * as desugarLoop from '../common/desugarLoop';
import * as desugarLabel from '../common/desugarLabel';
import * as desugarSwitch from '../common/desugarSwitch';

import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import * as nameExprs from './nameExprs';

import { transform } from '../common/helpers';

const runtime: string = `
const $__R = require('${__dirname}/runtime');
`;

export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const plugins : any[] = [
    [nameExprs, desugarLoop, declVars, desugarSwitch],
    [label],
    [jumper],
  ];
  const transformed: string = transform(code, plugins, opts)[0];

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${runtime}
  ${transformed}
  $__R.runtime($program);
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
