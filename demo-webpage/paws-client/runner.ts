declare const stopify: any;

window.addEventListener('message', evt => {
  switch (evt.data) {
    case 'run':
      stopify.loadScript();
      break;
    case 'stop':
      const postLineNum = () => {
        const rts = stopify.getRTS();
        window.parent.postMessage({
          linenum: rts.linenum
        }, '*');
      };
      stopify.stopScript(postLineNum);
      break;
    case 'step':
      stopify.stepScript();
      break;
    default:
      return;
  }
});
