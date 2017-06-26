import { stopifyFunction, stopifyPrint } from './stopifyStandaloneInterface';

const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from '../desugarLoop';
import * as desugarFunctionDecl from '../desugarFunctionDecl';
import * as desugarNew from '../desugarNew';
import * as desugarSwitch from '../desugarSwitch';
import * as desugarWhileToFunc from '../desugarLoopToFunc';
import * as desugarLabel from '../desugarLabel';
import * as liftVar from '../liftVar';

import * as makeBlockStmt from '../makeBlockStmt';
import * as fsm from '../fsm';

import { transform } from '../helpers';

export const stackStopifyPrint: stopifyPrint = (code) => {
  const plugins : any[] = [
    [liftVar, noArrows, desugarLoop, desugarLabel],
    [desugarSwitch],
    [makeBlockStmt, fsm]
  ];
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
