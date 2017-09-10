// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
'use strict';

let stopped = false;
let running: string;

let iframe: any = null;

function populateIFrame(html: string) {
  if (iframe !== null) {
    iframe.parentNode.removeChild(iframe);
  }

  iframe = document.createElement('iframe');
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.style.border = 'none';
  iframe.src = html + '#' + encodeURIComponent(JSON.stringify(['--env', 'chrome']));
  document.body.appendChild(iframe);
}

window.addEventListener('message', evt => {
  if (evt.data.code) {
    running = evt.data.code;
    console.log("Compilation successful. Hit 'Run' to execute program." )
  } else if (evt.data === 'run') {
    populateIFrame(running);
  } else if (evt.data === 'stop') {
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
