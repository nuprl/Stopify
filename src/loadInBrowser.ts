import { Stoppable } from './types';
import * as runtime from './runtime/default';

function getArgs(): string[] {
  if (window.location.hash.length < 2) {
    return [];
  };

  return JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
}

export function loadInBrowser(M: () => void, filename: string) {
  runtime.run(M, runtime.parseRuntimeOpts(getArgs(), filename), () => {
    window.document.title = "done";
  });
}