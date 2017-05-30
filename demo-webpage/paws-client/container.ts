'use strict';

import * as ace from 'brace';
import { CompilerClient } from '../compilers/compiler';
import { BuckleScript } from '../compilers/bucklescript-client';
import { Cljs } from '../compilers/clojurescript-client';
import { ScalaJS } from '../compilers/scalajs-client';
import { JavaScript } from '../compilers/javascript-client';
require('brace/mode/ocaml');
require('brace/mode/clojure');
require('brace/mode/scala')
require('brace/mode/javascript')
require('brace/theme/monokai');

const editor = ace.edit('editor');
editor.setTheme('ace/theme/monokai');

interface supportedLangs {
  [lang: string]: CompilerClient
}

const defaultLang = 'OCaml';

const langs : supportedLangs = {
  OCaml: BuckleScript,
  ClojureScript: Cljs,
  ScalaJS: ScalaJS,
  JavaScript: JavaScript,
};

editor.getSession().setMode(langs[defaultLang].aceMode);
editor.setValue(langs[defaultLang].defaultCode);

let iframe: any = null;
function loadJavaScript(jsCode: string, transform: string) {
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

function run(transform: string) {
  const languageSelect = <any>document.getElementById("language-selection");
  const val = languageSelect.value;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', langs[val].compileUrl);
  xhr.send(editor.getValue());
  xhr.addEventListener('load', () => {
    loadJavaScript(xhr.responseText, transform);
  });
}

function setupRun(name: string) {
  (<Node>document.getElementById("run-" + name)).addEventListener('click', () => {
    run(name);
  });
}

function selectLanguage() {
  const languageSelect = <any>document.getElementById("language-selection");
  languageSelect.addEventListener('input', () => {
    const val = (<any>document.getElementById("language-selection")).value;
    console.log(langs[val])
    editor.getSession().setMode(langs[val].aceMode);
    editor.setValue(langs[val].defaultCode);
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
