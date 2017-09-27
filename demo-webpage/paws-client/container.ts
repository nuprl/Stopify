import { encodeArgs } from '../../src/browserLine';
// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
'use strict';

let iframe: any = null;

function preloadIFrame(js: string) {
  if (iframe !== null) {
    iframe.parentNode.removeChild(iframe);
  }

  iframe = document.createElement('iframe');
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.style.border = 'none';
  iframe.src = './runner.html' + '#' +
    encodeArgs(['--env','chrome','-t','lazy','--estimator','countdown','-y','1',js]);
  document.body.appendChild(iframe);
}

function postToIFrame(msg: string) {
  if (iframe === null) {
    throw new Error(`No code loaded in iframe to ${msg}`);
  }

  iframe.contentWindow.postMessage(msg, '*');
}

window.addEventListener('message', evt => {
  if (evt.data.code) {
    console.log("Compilation successful. Hit 'Run' to execute program." )
    preloadIFrame(evt.data.code);
  } else {
    postToIFrame(evt.data);
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
