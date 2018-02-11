import * as browser from "detect-browser";
import { parseRuntimeOpts } from "../cli-parse";
import { Opts } from "../types";

function getOpts(): Opts {
  if (browser.name as any === "node") {
    return parseRuntimeOpts(process.argv.slice(2));
  }
  const optsArr = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
  return parseRuntimeOpts(optsArr);
}

export const opts = getOpts();
