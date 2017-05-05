'use strict';

import * as ace from 'brace';
require('brace/mode/ocaml');
require('brace/theme/monokai');

const editor = ace.edit('editor');
editor.getSession().setMode('ace/mode/ocaml');
editor.setTheme('ace/theme/monokai');
editor.setValue(
  `
  let rec tail_sum n acc =
      print_endline ("acc: " ^ (string_of_int acc));
  if n = 0 then acc else tail_sum (n - 1) (acc + n)

  let _ = tail_sum 1000000 1
  `);


let iframe = null;
function loadJavaScript(jsCode, transform) {
  if (iframe !== null) {
    iframe.parentNode.removeChild(iframe);
  }

  const container = document.getElementById('iframeContainer');
  iframe = document.createElement('iframe');
  iframe.src = "runner.html";
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.style.border = 'none';
  container.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow.postMessage({ code: jsCode, transform: transform }, '*');
  }
}

function run(transform) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/compile/ocaml');
  xhr.send(editor.getValue());
  xhr.addEventListener('load', () => {
    loadJavaScript(xhr.responseText, transform);
  });
}

function setupRun(name) {
  document.getElementById("run-" + name).addEventListener('click', () => {
    run(name);
  });
}

setupRun('sham');
setupRun('regenerator');
setupRun('yield');
setupRun('cps');

document.getElementById("stop").addEventListener('click', () => {
  if (iframe === null) {
    return;
  }

  iframe.contentWindow.postMessage('stop', '*');
});
