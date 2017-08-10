import { Runtime } from './callcc/runtime';

import eager from './callcc/eagerRuntime';
import lazy from './callcc/lazyRuntime';
import retval from './callcc/retvalRuntime';

export function makeRTS(mode: string, interval: number): Runtime {
  if (mode === 'eager') {
    return eager;
  }
  else if (mode === 'lazy') {
    return lazy;
  }
  else if (mode === 'retval') {
    return retval;
  }
  else {
    throw new Error(`unknown runtime system mode: ${mode}`);
  }
}
