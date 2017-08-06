

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

export const setImmediate = 
  (typeof chan !== 'undefined') 
    ? setImmediateMC 
    : setImmediateT0;