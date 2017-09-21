export * from './callcc/runtime';
export { makeRTS, getRTS } from './rts';
export * from './loadInBrowser';

import { plugin } from './callcc/stopifyCallCC';

export default plugin;
