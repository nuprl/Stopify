// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
'use strict';

import { yieldStopifyPrint } from '../../src/yield/stopifyYield';
import { cpsStopifyPrint } from '../../src/cps/stopifyCps';
import { callCCStopifyPrint } from '../../src/callcc/stopifyCallCC';
//import { shamStopify } from '../../src/stopifyImplementation/stopifySham';
//import { regeneratorStopify } from '../../src/stopifyImplementation/stopifyRegenerator';
import { stopifyFunction, stopifyPrint } from '../../src/interfaces/stopifyInterface';
let stopped = false;
let running: string;

const transforms : { [transform: string]: stopifyPrint }= {
  'yield': yieldStopifyPrint,
  'cps': cpsStopifyPrint,
  'callcc': callCCStopifyPrint,
}

function transform(f: stopifyPrint, code: string): string {
  return f(code, { debug: false, optimize: false, tail_calls: false, no_eval: false });
}

window.addEventListener('message', evt => {
  if (evt.data.code) {
    running = transform(transforms[evt.data.transform], evt.data.code);
    console.log("Compilation successful. Hit 'Run' to execute program." )
  }
  else if (evt.data === 'run') {
    stopped = false;
    eval(`(${running}).call(this, _ => stopped, () => console.log('Stopped'), () => {
        console.log("Done");
      }, 1)`);
  }
  else if (evt.data === 'stop') {
    stopped = true;
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
