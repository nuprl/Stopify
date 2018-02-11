/**
 * Runtime system for Node
 */
import { Runtime } from "stopify-continuations/dist/src/runtime/abstractRuntime";
import { parseRuntimeOpts } from "../cli-parse";
import { Opts } from "../types";
import { makeEstimator } from "./elapsedTimeEstimator";
import { RuntimeWithSuspend } from "./suspend";

const opts = parseRuntimeOpts(process.argv.slice(2));
let continuationsRTS: Runtime | undefined;

export function init(rts: Runtime) {
  continuationsRTS = rts;
  const suspendRTS = new RuntimeWithSuspend(continuationsRTS,
    opts.yieldInterval,
    makeEstimator(opts));

  if (typeof opts.stop !== "undefined") {
      setTimeout(function() {
        suspendRTS.onYield = () => false;
      }, opts.stop * 1000);
    }
  return suspendRTS;
}
