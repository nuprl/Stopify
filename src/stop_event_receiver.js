window.stopped = false;

window.addEventListener('message', evt => {
  window.stopped = true;
});

document.body.style.fontFamily = 'Monaco';
(function() {

  const originalConsole = window.console;

window.console = {

  log: function(message) {
    const elt = document.createElement('div');
    elt.appendChild(document.createTextNode(message.toString()));
    document.body.appendChild(elt);
    if (document.body.children.length > 1000) {
      document.body.removeChild(document.body.firstChild);
    }
  }
};
})();
