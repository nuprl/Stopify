import { knowns } from '../common/cannotCapture';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as jumper from './jumper';
import * as fastFreshId from '../fastFreshId';

export * from '../runtime/sentinels';
export { knownBuiltIns } from '../common/cannotCapture';

export * from '../types';
export { default as plugin } from './callcc';
export { flatness } from '../compiler/flatness';
export { fastFreshId };
export { unreachable } from '../generic';
export { default as hygiene } from '../common/hygiene';
export { transformFromAst } from '../common/helpers';
export { getSourceMap } from '../compiler/sourceMaps';
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

