import { Opts } from './types';
import { Runtime, YieldInterval, Latency } from './callcc/runtime';

import eager from './callcc/eagerRuntime';
import lazy from './callcc/lazyRuntime';
import retval from './callcc/retvalRuntime';
import fudge from './callcc/fudgeRuntime';

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
  else if (mode === 'fudge') {
    return fudge;
  }
  else {
    throw new Error(`unknown runtime system mode: ${mode}`);
  }
}

export function makeRTS(mode: string, opts: Opts): Runtime {
  const base = modeToBase(mode);
  if (opts.yieldMethod === 'fixed') {
    const withSuspend = YieldInterval(base);
    const rts = new withSuspend();
    rts.setInterval(opts.yieldInterval);
    return rts;
  }
  else {
    const withSuspend = Latency(base);
    const rts = new withSuspend();
    rts.setLatency(opts.yieldInterval);
    return rts;
  }
}