export { default as plugin } from './callcc';
import { knowns } from '../common/cannotCapture'
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeHOFs from '../exposeHOFs';
import * as jumper from './jumper';

export { default as cleanupGlobals } from '../common/cleanupGlobals';
export { default as hygiene } from '../common/hygiene';
export { transformFromAst } from '../common/helpers';
export { default as markFlatFunctions } from '../common/markFlatFunctions';
export { default as markAnnotated } from '../common/markAnnotated'
import * as fastFreshId from '../fastFreshId';
export { default as markFlatApplications } from '../common/markFlatApplications'
export { default as runtime } from '../runtime/default';
import * as rts from '../rts';
export { fastFreshId, rts }

export const reserved = [
  ...knowns,
  exposeImplicitApps.implicitsIdentifier.name,
  exposeHOFs.hofIdentifier.name,
  "$opts",
  "$result",
  "target",
  "newTarget",
  "captureLocals",
  jumper.restoreNextFrame.name,
  "frame",
  "SENTINAL",
  "finally_rv",
  "captureCC",
];
