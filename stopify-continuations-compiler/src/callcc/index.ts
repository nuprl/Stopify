import { knowns } from '../common/cannotCapture';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as jumper from './jumper';

export * from '../runtime/sentinels';
export { knownBuiltIns } from '../common/cannotCapture';

export { default as plugin } from './callcc';
export { flatness } from '../compiler/flatness';
export { getSourceMap } from '../compiler/sourceMaps';
export * from '../types';

export const reserved = [
  ...knowns,
  "name",
  exposeImplicitApps.implicitsIdentifier.name,
  "$opts",
  "$result",
  "target",
  "newTarget",
  "captureLocals",
  jumper.restoreNextFrame.name,
  "frame",
  "RV_SENTINAL",
  "EXN_SENTINAL",
  "finally_rv",
  "finally_exn",
  "captureCC",
  'materializedArguments',
  'argsLen',
  '$top',
  '$S'
];

