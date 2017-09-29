declare const stopify: any;

let loaded = false;

const textarea = document.getElementById('data')!;
textarea.onchange = function () {
  textarea.scrollTop = textarea.scrollHeight;
}

function notifyStop() {
  const postLineNum = () => {
    const rts = stopify.getRTS();
    window.parent.postMessage({
      linenum: rts.linenum
    }, '*');
  };
  stopify.stopScript(postLineNum);
}

window.addEventListener('message', evt => {
  switch (evt.data) {
    case 'run':
      if (loaded) {
        stopify.resumeScript();
      } else {
        loaded = true;
        stopify.loadScript();
      }
      break;
    case 'stop':
      notifyStop();
      break;
    case 'step':
      if (loaded) {
        stopify.stepScript();
      } else {
        loaded = true;
        stopify.loadScript(() => notifyStop());
      }
      break;
    default:
      return;
  }
});
