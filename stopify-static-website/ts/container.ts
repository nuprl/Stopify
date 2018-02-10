// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.

import * as browser from 'detect-browser'

// compiled bundle must be available
declare const stopify: any;

const data = <HTMLTextAreaElement>document.getElementById('data')!;

console.log = function (str: any) {
  data.value = data.value + str + '\n';
  const evt = new Event('change');
  data.dispatchEvent(evt);
}

let task: any; // of type AsyncRunner

window.addEventListener('message', evt => {
  if (evt.source !== window.parent) {
    return;
  }
  const message = evt.data;
  const { type } = message;
  switch (type) {
    case 'start':
      task = stopify.stopify('https://storage.googleapis.com/stopify-compiler-output/' + message.path, message.opts);
      task.setBreakpoints(message.breakpoints);
      task.run(() => { },
        () => { },
        updateCurrentLine);
      break;
    case 'pause':
      task.pause(updateCurrentLine);
      break;
    case 'continue':
      task.setBreakpoints(message.breakpoints);
      task.resume();
      break;
    case 'step':
      task.step(updateCurrentLine);
  }
});

function updateCurrentLine(line?: number) {
  window.parent.postMessage({ type: 'paused', linenum: line }, '*');
}

document.body.style.fontFamily = 'Monaco';

window.parent.postMessage({ type: 'ready' }, '*');


const postLineNum = () => {
  const rts = stopify.getRTS();
  window.parent.postMessage({
    linenum: rts.linenum
  }, '*');
};
//stopify.setOnStop(postLineNum);

const textarea = document.getElementById('data')!;
textarea.onchange = function () {
  textarea.scrollTop = textarea.scrollHeight;
}

