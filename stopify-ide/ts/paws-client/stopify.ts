'use strict';

import * as browser from 'detect-browser'
import * as ace from 'brace';
import { CompilerClient } from '../compilers/compiler';
import { BuckleScript } from '../compilers/bucklescript-client';
import { Cljs } from '../compilers/clojurescript-client';
import { Emcc } from '../compilers/emscripten-client';
import { ScalaJS } from '../compilers/scalajs-client';
import { JavaScript } from '../compilers/javascript-client';
require('brace/mode/ocaml');
require('brace/mode/c_cpp');
require('brace/mode/clojure');
require('brace/mode/scala')
require('brace/mode/javascript')
require('brace/theme/monokai');
import { encodeArgs } from 'stopify/built/src/browserLine';
const Range = ace.acequire('ace/range').Range;

// True if buffer has changed since the last compile.
let dirtyEditor = true;
// stopped : no program loaded, though last program's output may be visible.
//           May transition to 'compiling'
// 'compiling' : may transition to 'running' or 'stopped', if an error occurs
let ideMode : 'stopped' | 'paused' | 'compiling' | 'running' = 'stopped';


const iframeContainer = <HTMLDivElement>document.getElementById('iframeContainer');
let iframe : HTMLIFrameElement | undefined;

// TODO(rachit): Hack to share the editor with the runner. Should probably
// be fixed.
const editor = ace.edit('editor');

editor.setTheme('ace/theme/monokai');
editor.setFontSize('15');

editor.onDocumentChange = () => {
  dirtyEditor = true;
}

let breakpoints: number[] = [];
let lastLineMarker: number | null = null;
let lastLine: number | null = null;
function editorSetLine(n: number) {
  if (lastLineMarker !== null) {
    editor.session.removeMarker(lastLineMarker);
  }
  lastLineMarker = editor.session.addMarker(
    new Range(n, 0, n, 1),
    "myMarker", "fullLine", false);
  editor.scrollToLine(n, true, false, function () {});
  lastLine = n;
}

function updateBreakpoints(e: any) {
  const target = e.domEvent.target;
  if (target.className.indexOf("ace_gutter-cell") == -1) {
    return;
  }

  const row = e.getDocumentPosition().row;
  if(breakpoints.includes(row+1)) {
    editor.session.clearBreakpoint(row);
    breakpoints.splice(breakpoints.lastIndexOf(row+1), 1);
  } else {
    editor.session.setBreakpoint(row,'ace_breakpoint');
    breakpoints.push(row+1);
  }
  editor.renderer.updateBreakpoints();
  e.stop();
}
editor.on("guttermousedown", updateBreakpoints);

window.addEventListener('message', evt => {
  if (evt.data.type === 'ready') {
    if (ideMode === 'compiling') {
      ideMode = 'running';
      iframe!.contentWindow.postMessage({
        type: 'start',
        breakpoints: breakpoints
      }, '*');
    }
  }
  else  if (evt.data.linenum && evt.data.linenum-1 === lastLine) {
    iframe!.contentWindow.postMessage('step', '*');
  } else {
    // Ace Editor is 0-indexed and source-maps are 1-indexed
    editorSetLine(evt.data.linenum-1);
  }
});

interface supportedLangs {
  [lang: string]: CompilerClient
}

const defaultLang = 'JavaScript';

const langs : supportedLangs = {
  ScalaJS: ScalaJS,
  OCaml: BuckleScript,
  Cpp: Emcc,
  ClojureScript: Cljs,
  JavaScript: JavaScript,
};

editor.getSession().setMode(langs[defaultLang].aceMode);
editor.setValue(langs[defaultLang].defaultCode);

function compile() {
  ideMode = 'compiling';
  if (lastLineMarker !== null) {
    editor.session.removeMarker(lastLineMarker);
  }
  const languageSelect = <any>document.getElementById("language-selection");
  const val = languageSelect.value;
  const data = {
    code: editor.getValue(),
    new: browser.name === 'chrome' ? 'wrapper' : 'direct',
    transform: 'lazy',
  };
  fetch(new Request(langs[val].compileUrl, {
    method: 'POST',
    body: JSON.stringify(data)
  }))
  .then(resp => resp.text())
  .then(path => {
    if (iframe) {
      iframe.remove();
    }
    const fragment = encodeArgs(['--env', browser.name, '-t', 'lazy',
      '--estimator', 'countdown', '-y', '1', path]);
    const url = `./container.html#${fragment}`;
    iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = "50%";
    iframe.height = "100%";
    iframe.style.border = 'none';
    iframeContainer.appendChild(iframe);
  }).catch(reason => {
    alert(reason);
    if (iframe) {
      iframe.remove();
    }
    ideMode = 'stopped';
  });
}

function selectLanguage() {
  const languageSelect = <any>document.getElementById("language-selection");
  languageSelect.addEventListener('input', () => {
    const val = (<any>document.getElementById("language-selection")).value;
    if (lastLineMarker !== null) {
      editor.session.removeMarker(lastLineMarker);
    }
    editor.getSession().setMode(langs[val].aceMode);
    editor.setValue(langs[val].defaultCode);
  });
}

document.getElementById('playPause')!.addEventListener('click', () => {
  switch (ideMode) {
    case 'compiling':
      return;
    case 'stopped':
      return compile();
    case 'running':
      ideMode = 'paused';
      iframe!.contentWindow.postMessage({ type: 'pause' }, '*');
      return;
    case 'paused':
      iframe!.contentWindow.postMessage({ 
        type: 'continue', 
        breakpoints: breakpoints
      }, '*');
      return;
  }
});

document.getElementById('step')!.addEventListener('click', () => {
  if (ideMode !== 'paused') {
    return;
  }
  iframe!.contentWindow.postMessage({ type: 'step' }, '*');
});

document.getElementById('stop')!.addEventListener('click', () => {
  switch (ideMode) {
    case 'compiling':
      if (iframe) {
        iframe.remove();
        iframe = undefined;
      }
      break;
    case 'running':
      iframe!.contentWindow.postMessage({ type: 'pause' }, '*');
      break;
    case 'stopped':
    case 'paused':
  }
  ideMode = 'stopped';
});

selectLanguage();
