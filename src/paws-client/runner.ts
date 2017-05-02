// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
'use strict';

import { yieldStopify } from '../stopifyYield';
import { cpsStopify } from '../stopifyCPSEval';
import { shamStopify } from '../stopifySham';
import { regeneratorStopify } from '../stopifyRegenerator';
import { Stoppable } from '../stopifyInterface';
let stopped = false;

let running: Stoppable = null;

const transforms = {
  'sham': shamStopify,
  'yield': yieldStopify,
  'regenerator': regeneratorStopify,
  'cps': cpsStopify
}

export function stopify(f, code: string): Stoppable {
  let stopped = false;
  return f(code, () => stopped, () => stopped = true);
}

window.addEventListener('message', evt => {
  if (evt.data.code) {
    running = stopify(transforms[evt.data.transform],
      evt.data.code);
    running.run(() => console.log("Done"));
  }
  else if (evt.data === 'stop') {
    running.stop(() => console.log("Terminated"));
  }
});

document.body.style.fontFamily = 'Monaco';

const originalConsole = window.console;

window.console.log = function(message) {
  const elt = document.createElement('div');
  elt.appendChild(document.createTextNode(message.toString()));
  document.body.appendChild(elt);
  if (document.body.children.length > 1000) {
    document.body.removeChild(document.body.firstChild);
  }
}
