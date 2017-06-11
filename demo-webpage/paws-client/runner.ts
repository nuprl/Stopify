// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
'use strict';

import { yieldStopify } from '../../src/stopifyImplementation/stopifyYield';
import { yieldSteppify } from '../../src/stepifyImplementation/steppifyYield';
import { cpsStopify } from '../../src/stopifyImplementation/stopifyCPSEval';
import { shamStopify } from '../../src/stopifyImplementation/stopifySham';
import { regeneratorStopify } from '../../src/stopifyImplementation/stopifyRegenerator';
import { Stoppable, stopify, isStopify } from '../../src/stopifyImplementation/stopifyInterface';
import { Steppable, steppify, isSteppable } from '../../src/stepifyImplementation/steppifyInterface';
let stopped = false;

let running: Stoppable | Steppable;

const transforms : { [transform: string]: stopify | steppify }= {
  'sham': shamStopify,
  'yield': yieldStopify,
  'regenerator': regeneratorStopify,
  'cps': cpsStopify,
  'yield-debug': yieldSteppify,
}

function transform(f: stopify | steppify, code: string): Stoppable | Steppable {
  let stopped = false;
  if (isStopify(f)) {
    return f(code, () => stopped, () => stopped = true);
  } else {
    // TODO(rachit): Implement breakpoints
      return f(code, [], () => stopped, () => stopped = true,
               (lin: number) => {
                   window.parent.postMessage(lin, '*');
               })
  }
}

window.addEventListener('message', evt => {
  if (evt.data.code) {
    running = transform(transforms[evt.data.transform], evt.data.code);
    if (isSteppable(running)) {
      console.log("Compilation successful in debugging mode. Hit 'Step' to single step or hit 'Run' to execute program." )
    } else {
      console.log("Compilation successful. Hit 'Run' to execute program." )
    }
  }
  else if (evt.data === 'run') {
    running.run(() => console.log('Done'))
  }
  else if (evt.data === 'stop') {
    running.stop(() => console.log('Stopped'));
  }
  else if (evt.data === 'step') {
    if (isSteppable(running)) {
      running.step(() => console.log('Done'), false)
    } else {
      console.log('Not in debugging mode. Please compile with debug mode.')
    }
  }
});

document.body.style.fontFamily = 'Monaco';

const originalConsole = window.console;

window.console.log = function(message: string) {
  const elt = document.createElement('div');
  elt.appendChild(document.createTextNode(message.toString()));
  document.body.appendChild(elt);
  if (document.body.children.length > 1000) {
    document.body.removeChild(<Node>document.body.firstChild);
  }
}
