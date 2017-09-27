declare const stopify: any;

window.addEventListener('message', evt => {
  switch (evt.data) {
    case 'run':
      stopify.loadScript();
      break;
    case 'stop':
      stopify.stopScript();
      break;
    case 'step':
      stopify.stepScript();
      break;
    default:
      return;
  }
});
