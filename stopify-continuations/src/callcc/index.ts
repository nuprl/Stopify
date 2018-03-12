import { knowns } from '../common/cannotCapture';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeHOFs from '../exposeHOFs';
import * as jumper from './jumper';
import * as fastFreshId from '../fastFreshId';

export * from '../types';
export { default as plugin } from './callcc';
export { flatness } from '../compiler/flatness';
export { fastFreshId };
export { unreachable } from '../generic';
export { default as cleanupGlobals } from '../common/cleanupGlobals';
export { default as hygiene } from '../common/hygiene';
export { transformFromAst } from '../common/helpers';
export const reserved = [
  ...knowns,
  "name",
  exposeImplicitApps.implicitsIdentifier.name,
  exposeHOFs.hofIdentifier.name,
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
];

