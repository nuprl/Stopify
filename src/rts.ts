import { Runtime, YieldInterval } from './callcc/runtime';

import eager from './callcc/eagerRuntime';
import lazy from './callcc/lazyRuntime';
import retval from './callcc/retvalRuntime';

function modeToBase(mode: string) {
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

export function makeRTS(mode: string, interval: number): Runtime {
  const base = modeToBase(mode);
  const withSuspend = YieldInterval(base);
  const rts = new withSuspend();
  rts.setInterval(interval);
  return rts;
}