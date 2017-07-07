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

import { transform } from '../common/helpers';

export const callCCStopifyPrint: stopifyPrint = (code, opts) => {
  const plugins : any[] = [
    [liftVar, noArrows, desugarLoop, desugarLabel],
    [desugarSwitch],
    [makeBlockStmt]
  ];
  const transformed = transform(code, plugins, opts);

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
