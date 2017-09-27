import * as browser from 'detect-browser'


const chan = (typeof MessageChannel !== 'undefined') ? 
  new MessageChannel() : undefined;

// We can't send closures over MessageChannels.
const chanThunks: (() => void)[] = [];

if (typeof chan !== 'undefined') {
  chan.port2.onmessage = function(evt) {
    // Assumes that there is a function to apply.
    return chanThunks.pop()!();
  }
}

export function setImmediateMC(thunk: () => void): void {
  chanThunks.push(thunk);
  return chan!.port1.postMessage(true);
}

export function setImmediateT0(thunk: () => void): void {
  setTimeout(thunk, 0);
}

function makeSetImmediatePM(): (thunk: () => void) => void {
  const thunks: (() => void)[] = [];
  window.addEventListener('message', (evt) => {
    if (evt.data === true) {
      return thunks.pop()!();
    }
  });
  return (thunk) => {
    thunks.push(thunk);
    window.postMessage(true, '*');
  };
}

function makeSetImmediate(): (thunk: () => void) => void {
  if (<any>browser.name === 'node') {
    return setImmediateT0;
  }
  else if (browser.name === 'safari') {
    return setImmediateMC;
  }
  else if (browser.name === 'firefox') {
    return setImmediateMC;
  }
  else if (browser.name === 'chrome') {
    return makeSetImmediatePM();
  }
  else {
    console.warn(`Stopify has not been benchmarked with ${browser.name}.`);
    return makeSetImmediatePM();
  }
}

export const setImmediate = makeSetImmediate();