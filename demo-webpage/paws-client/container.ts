'use strict';

import * as ace from 'brace';
require('brace/mode/ocaml');
require('brace/mode/clojure');
require('brace/theme/monokai');

const ocamlDefault: string =
  `
  let rec tail_sum n acc =
      print_endline ("acc: " ^ (string_of_int acc));
  if n = 0 then acc else tail_sum (n - 1) (acc + n)

  let _ = tail_sum 1000000 1
  `;
const clojureDefault: string =
  `
  (defn tail_sum [n acc]
    (println (str "acc: " acc))
    (if (= n 0)
      acc
      (tail_sum (- n 1) (+ acc n))))
  (println (tail_sum 6 1))
  `;

const editor = ace.edit('editor');
editor.setTheme('ace/theme/monokai');
editor.getSession().setMode('ace/mode/ocaml');
editor.setValue(ocamlDefault);

const langs = {
    OCaml: {
      mode: 'ace/mode/ocaml',
      code: ocamlDefault,
      compile: '/compile/ocaml'
    },
    ClojureScript: {
      mode: 'ace/mode/clojure',
      code: clojureDefault,
      compile: '/compile/cljs'
    },
};

let iframe: any = null;
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
  (<Node>container).appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow.postMessage({ code: jsCode, transform: transform }, '*');
  }
}

function run(transform) {
  const languageSelect = <any>document.getElementById("language-selection");
  const val = languageSelect.value;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', langs[val].compile);
  xhr.send(editor.getValue());
  xhr.addEventListener('load', () => {
    loadJavaScript(xhr.responseText, transform);
  });
}

function setupRun(name) {
  (<Node>document.getElementById("run-" + name)).addEventListener('click', () => {
    run(name);
  });
}

function selectLanguage() {
  const languageSelect = <any>document.getElementById("language-selection");
  languageSelect.addEventListener('input', () => {
    const val = (<any>document.getElementById("language-selection")).value;
    editor.getSession().setMode(langs[val].mode);
    editor.setValue(langs[val].code);
  });
}

setupRun('sham');
setupRun('regenerator');
setupRun('yield');
setupRun('cps');
selectLanguage();

(<Node>document.getElementById("stop")).addEventListener('click', () => {
  if (iframe === null) {
    return;
  }

  iframe.contentWindow.postMessage('stop', '*');
});
