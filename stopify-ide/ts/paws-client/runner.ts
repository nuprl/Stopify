declare const stopify: any;

let loaded = false;

const textarea = document.getElementById('data')!;
textarea.onchange = function () {
  textarea.scrollTop = textarea.scrollHeight;
}

const postLineNum = () => {
  const rts = stopify.getRTS();
  window.parent.postMessage({
    linenum: rts.linenum
  }, '*');
};
stopify.setOnStop(postLineNum);

window.addEventListener('message', evt => {
  if (evt.data.run) {
    if (loaded) {
      stopify.setBreakpoints(evt.data.run);
      stopify.resumeScript();
    } else {
      loaded = true;
      stopify.loadScript(() => stopify.setBreakpoints(evt.data.run));
    }
  } else {
    switch (evt.data) {
      case 'stop':
        stopify.stopScript();
        break;
      case 'step':
        if (loaded) {
          stopify.stepScript();
        } else {
          loaded = true;
          stopify.loadScript(stopify.stopScript);
        }
        break;
      default:
        return;
    }
  }
});
