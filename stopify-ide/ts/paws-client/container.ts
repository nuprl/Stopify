import * as browser from 'detect-browser'
import { encodeArgs } from 'stopify/built/src/browserLine';

// compiled bundle must be available
declare const stopify: any;

// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.

window.addEventListener('message', evt => {
  const message = evt.data;
  const { type } = message;
  switch (type) {
    case 'start':
      stopify.loadScript(() => stopify.setBreakpoints(message.breakpoints));
      break;
    case 'pause':
      stopify.stopScript();
      break;
    case 'resume':
      stopify.setBreakpoints(message.breakpoints);
      stopify.resumeScript();
      break;
    case 'step':
      stopify.stepScript();
  }
});

document.body.style.fontFamily = 'Monaco';

window.parent.postMessage({ type: 'ready' }, '*');


const postLineNum = () => {
  const rts = stopify.getRTS();
  window.parent.postMessage({
    linenum: rts.linenum
  }, '*');
};
stopify.setOnStop(postLineNum);

const textarea = document.getElementById('data')!;
textarea.onchange = function () {
  textarea.scrollTop = textarea.scrollHeight;
}

