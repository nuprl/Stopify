import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface';

const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from '../common/desugarLoop';
import * as desugarFunctionDecl from '../common/desugarFunctionDecl';
import * as desugarNew from '../common/desugarNew';
import * as desugarSwitch from '../common/desugarSwitch';
import * as desugarWhileToFunc from '../common/desugarLoopToFunc';
import * as desugarLabel from '../common/desugarLabel';
import * as liftVar from '../common/liftVar';

import * as makeBlockStmt from '../common/makeBlockStmt';
import * as fsm from './fsm';

import { transform } from '../common/helpers';

export const stackStopifyPrint: stopifyPrint = (code, opts) => {
  const plugins : any[] = [
    [liftVar, noArrows, desugarLoop, desugarLabel],
    [desugarSwitch],
    [makeBlockStmt, fsm]
  ];
  const transformed = transform(code, plugins, opts);

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${transformed}
  $onDone();
}
`
}

export const stackStopify: stopifyFunction = (code, opts) => {
  return eval(`
(function () {
  return (${stackStopifyPrint(code, opts)});
})()
`)
}
