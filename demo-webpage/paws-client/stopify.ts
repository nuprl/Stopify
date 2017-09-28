'use strict';

import * as browser from 'detect-browser'
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
const Range = ace.acequire('ace/range').Range;

let iframe = <HTMLIFrameElement>document.getElementById('iframeContainer')!;

// TODO(rachit): Hack to share the editor with the runner. Should probably
// be fixed.
const editor = ace.edit('editor');
editor.setTheme('ace/theme/monokai');
editor.setFontSize('15')

let lastLineMarker: number | null = null;
let lastLine: number | null = null;
function editorSetLine(n: number) {
  if (lastLineMarker !== null) {
    editor.session.removeMarker(lastLineMarker);
  }
  lastLineMarker = editor.session.addMarker(
    new Range(n, 0, n, 1),
    "myMarker", "fullLine", false);
  lastLine = n;
}

window.addEventListener('message', evt => {
  if (evt.data.linenum && evt.data.linenum-1 === lastLine) {
    console.log('foo');
    iframe.contentWindow.postMessage('step', '*');
  } else {
    // Ace Editor is 0-indexed and source-maps are 1-indexed
    editorSetLine(evt.data.linenum-1);
  }
});

interface supportedLangs {
  [lang: string]: CompilerClient
}

const defaultLang = 'ScalaJS';

const langs : supportedLangs = {
  ScalaJS: ScalaJS,
  OCaml: BuckleScript,
  ClojureScript: Cljs,
  JavaScript: JavaScript,
};

editor.getSession().setMode(langs[defaultLang].aceMode);
editor.setValue(langs[defaultLang].defaultCode);

function loadJavaScript(js: string) {
  iframe.contentWindow.postMessage({ code: js }, '*');
}

function compileRequest() {
  const languageSelect = <any>document.getElementById("language-selection");
  const val = languageSelect.value;
  const xhr = new XMLHttpRequest();
  xhr.open('POST', langs[val].compileUrl);
  const data = {
    code: editor.getValue(),
    new: browser.name === 'chrome' ? 'wrapper' : 'direct',
    transform: 'lazy',
  };
  xhr.send(JSON.stringify(data));
  xhr.addEventListener('load', () => {
    loadJavaScript(xhr.responseText);
  });
}

function setupCompile() {
  document.getElementById("compile")!.addEventListener('click', () => {
    if (lastLineMarker !== null) {
      editor.session.removeMarker(lastLineMarker);
    }
    compileRequest();
  });
}

function selectLanguage() {
  const languageSelect = <any>document.getElementById("language-selection");
  languageSelect.addEventListener('input', () => {
    const val = (<any>document.getElementById("language-selection")).value;
    console.log(langs[val])
    if (lastLineMarker !== null) {
      editor.session.removeMarker(lastLineMarker);
    }
    editor.getSession().setMode(langs[val].aceMode);
    editor.setValue(langs[val].defaultCode);
  });
}

setupCompile();
selectLanguage();

function setupButton(buttonId: string, eventName: string) {
  (<Node>document.getElementById(buttonId)).addEventListener('click', () => {
    if (iframe === null) {
      return;
    }

    iframe.contentWindow.postMessage(eventName, '*');
  });
}

setupButton('stop', 'stop')
setupButton('run', 'run')
setupButton('step', 'step')
