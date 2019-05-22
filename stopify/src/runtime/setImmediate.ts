/**
 * A browser-dependent implementation of setImmediate. We have performed
 * simple experiments to determine which implementation of setImmediate is
 * fastest on each browser. We use postMessage for any browser that we haven't
 * tested.
 */
import * as browser from 'detect-browser';

function makeSetImmediateMC(): (thunk: () => void) => void {
  const chan = new MessageChannel();

  // We can't send closures over MessageChannels.
  const chanThunks: (() => void)[] = [];

  chan.port2.onmessage = function(evt) {
    const func = chanThunks.pop();
    if (typeof func === 'function') {
      return func();
    }
    else {
      throw new Error(`makeSetImmediateMC expected a function, received: ${func}`);
    }
  };

  return (thunk) => {
    chanThunks.push(thunk);
    return chan.port1.postMessage(true);
  };
}

export function setImmediateT0(thunk: () => void): void {
  setTimeout(thunk, 0);
}

function makeSetImmediatePM(): (thunk: () => void) => void {
  const thunks: (() => void)[] = [];
  window.addEventListener('message', (evt) => {
    if (evt.data === true) {
      const func = thunks.pop();
      if (typeof func === 'function') {
        return func();
      }
      else {
        throw new Error(`makeSetImmediatePM expected a function, received: ${func}`);
      }
    }
  });
  return (thunk) => {
    thunks.push(thunk);
    // NOTE(arjun): This likely conflicts with other uses of postMessage.
    window.postMessage(true, '*');
  };
}

function makeSetImmediate(): (thunk: () => void) => void {
  if (typeof self === "object" && typeof (self as any).importScripts === 'function') {
    return setImmediateT0;
  }
  // browser can be null
  else if (!browser || <any>browser.name === 'node') {
    return setImmediateT0;
  }
  else if (browser.name === 'safari') {
    return makeSetImmediateMC();
  }
  else if (browser.name === 'firefox') {
    return makeSetImmediateMC();
  }
  else if (browser.name === 'chrome') {
    return makeSetImmediatePM();
  }
  else if (browser.name === 'edge') {
    return makeSetImmediateMC();
  }
  else {
    console.warn(`Stopify has not been benchmarked with ${browser.name}. Defaulting to slow window.postMessage.`);
    return makeSetImmediatePM();
  }
}

export const setImmediate = makeSetImmediate();
