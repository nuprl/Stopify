/**
 * A browser-dependent implementation of setImmediate. We have performed
 * simple experiments to determine which implementation of setImmediate is
 * fastest on each browser. We use postMessage for any browser that we haven't
 * tested.
 */
import * as browser from "detect-browser";

function makeSetImmediateMC(): (thunk: () => void) => void {
  const chan = new MessageChannel();

  // We can't send closures over MessageChannels.
  const chanThunks: Array<() => void> = [];

  chan.port2.onmessage = function(evt) {
     // Assumes that there is a function to apply.
    return chanThunks.pop()!();
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
  const thunks: Array<() => void> = [];
  window.addEventListener("message", (evt) => {
    if (evt.data === true) {
      return thunks.pop()!();
    }
  });
  return (thunk) => {
    thunks.push(thunk);
    // NOTE(arjun): This likely conflicts with other uses of postMessage.
    window.postMessage(true, "*");
  };
}

function makeSetImmediate(): (thunk: () => void) => void {
  // browser can be null
  if (!browser || browser.name as any === "node") {
    return setImmediateT0;
  } else if (browser.name === "safari") {
    return makeSetImmediateMC();
  } else if (browser.name === "firefox") {
    return makeSetImmediateMC();
  } else if (browser.name === "chrome") {
    return makeSetImmediatePM();
  } else if (browser.name === "edge") {
    return makeSetImmediateMC();
  } else {
    console.warn(`Stopify has not been benchmarked with ${browser.name}.`);
    return makeSetImmediatePM();
  }
}

export const setImmediate = makeSetImmediate();
