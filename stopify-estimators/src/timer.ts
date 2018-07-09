import * as browser from 'detect-browser';

export declare function suspend(): boolean;
export declare function reset(): void;
export declare function init(ms: number): Buffer;
export declare function cancel(): void;

if (!browser || <any>browser.name === 'node') {
  // Hide `require` inside an `eval` so that webpacking doesn't break.
  const timer = eval(`require('../build/Release/timer')`);
  module.exports = timer;
}
