import { Opts } from '../types';
import * as browser from 'detect-browser';
import { parseRuntimeOpts } from '../cli-parse';

function getOpts(): Opts {
  if (<any>browser.name === 'node') {
    return parseRuntimeOpts(process.argv.slice(2));
  }
  const optsArr = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  return parseRuntimeOpts(optsArr);
}

export const opts = getOpts();
