'use strict';

const ace = require('brace');
require('brace/mode/ocaml');
require('brace/theme/monokai');

const editor = ace.edit('editor');
editor.getSession().setMode('ace/mode/ocaml');
editor.setTheme('ace/theme/monokai');
editor.setValue(
  `
  let rec tail_fac n acc =
      print_endline ("acc: " ^ (string_of_int acc));
  if n = 0 then acc else tail_fac (n - 1) (acc * n)

  let _ = tail_fac 100 1
  `);


let iframe = null;
function loadJavaScript(jsCode) {
  if (iframe !== null) {
    iframe.parentNode.removeChild(iframe);
  }

  const container = document.getElementById('iframeContainer');
  iframe = document.createElement('iframe');
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.style.border = 'none';
  container.appendChild(iframe);
  iframe.contentWindow.eval(jsCode);
}

document.getElementById("run").addEventListener('click', () => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/compile/ocaml');
  xhr.send(editor.getValue());
  xhr.addEventListener('load', () => {
    loadJavaScript(xhr.responseText);
  });
});

document.getElementById("stop").addEventListener('click', () => {
  if (iframe === null) {
    return;
  }

  iframe.contentWindow.postMessage('stop', '*');
});
