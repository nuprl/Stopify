import * as React from "react";
import { render } from 'react-dom';
import AceEditor from 'react-ace';
import { StopifyAce } from './StopifyAce';
import * as browser from 'detect-browser'
import * as ace from 'brace';
import { CompilerClient } from '../compilers/compiler';
import { BuckleScript } from '../compilers/bucklescript-client';
import { Cljs } from '../compilers/clojurescript-client';
import { Emcc } from '../compilers/emscripten-client';
import { ScalaJS } from '../compilers/scalajs-client';
import { JavaScript } from '../compilers/javascript-client';
import { encodeArgs } from 'stopify/built/src/browserLine';

interface supportedLangs {
  [lang: string]: CompilerClient
}

const langs : supportedLangs = {
  ScalaJS: ScalaJS,
  OCaml: BuckleScript,
  Cpp: Emcc,
  ClojureScript: Cljs,
  JavaScript: JavaScript,
};

type Mode = 'stopped' | 'paused' | 'compiling' | 'running';

class MultilingualStopifyEditor extends React.Component<{}, {language: string}> {

  constructor(props: { language: string }) {
    super(props);
    this.state = {
      language: 'JavaScript'
    };
  }

  updateState(event: React.ChangeEvent<HTMLSelectElement>) {
    this.setState({ language: event.target.value });
  }

  render() {
    return [
      <div key="chooseLang" className="row">
        <div className="col-md-12">
          <span className="dropdown">
            <button className="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
              Language
              <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
              <li><a href="#" onClick={() => this.setState({ language: 'ScalaJS' })}>Scala</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'OCaml' })}>OCaml</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'Cpp' })}>C++</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'ClojureScript' })}>Clojure</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'JavaScript' })}>JavaScript</a></li>
            </ul>
          </span>
          Choose a programming language to use.    
        </div>
      </div>,
      <StopifyEditor key="editor" language={this.state.language}></StopifyEditor>
    ];
  }
}

interface StopifyEditorState {
  mode: Mode,
  program: string,
  breakpoints: number[],
  line: number | null,
  iframeUrl?: string
}

const jsonRequestHeaders = new Headers();
jsonRequestHeaders.append("Content-Type", "application/json");

class StopifyEditor extends React.Component<{ language: string }, StopifyEditorState> {

  private iframe: HTMLIFrameElement | null = null;

  constructor(props: { language: string }) {
    super(props);
    // editor.getSession().setMode(langs[props.language].aceMode);
    // if (lastLineMarker !== null) {
    //   editor.session.removeMarker(lastLineMarker);
    // }
    this.state = {
      mode: 'stopped',
      program: '',
      breakpoints: [],
      line: null
    };

    window.addEventListener('message', evt => {
      // Message could be from somethign else, e.g., React DevTools
      if (this.iframe === null || evt.source !== this.iframe.contentWindow) {
        return;
      }
      if (evt.data.type === 'ready') {
        if (this.state.mode === 'compiling') {
          this.setMode('running');
          this.iframe!.contentWindow.postMessage({
            type: 'start',
            breakpoints: this.state.breakpoints
          }, '*');
        }
      }
      else  if (evt.data.linenum && evt.data.linenum-1 === this.state.line) {
        this.iframe!.contentWindow.postMessage({ type: 'step' }, '*');
      }
      else {
        this.setState({
          mode: 'paused',
          line: evt.data.linenum - 1 || null
        });
      }
    });
  }

  setProgram(program: string) {
    this.setState({
      program: program,
    });
  }

  setBreakpoints(breakpoints: number[]) {
    this.setState({ breakpoints });
  }

  setMode(mode: Mode) {
    this.setState({
      program: this.state.program,
      mode: mode,
      breakpoints: this.state.breakpoints
    });
  }

  compile() {
    this.setMode('compiling');
    // if (lastLineMarker !== null) {
    //   editor.session.removeMarker(lastLineMarker);
    // }
    const data = {
      code: this.state.program,
      new: browser.name === 'chrome' ? 'wrapper' : 'direct',
      transform: 'lazy',
    };
    fetch(new Request(langs[this.props.language].compileUrl, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: jsonRequestHeaders
    }))
    .then(resp =>
      resp.text().then(text => {
        if (resp.status === 200) {
          return text;
        }
        else {
          throw text;
        }
      }))
    .then(path => {
      const fragment = encodeArgs(['--env', browser.name, '-t', 'lazy',
        '--estimator', 'countdown', '-y', '1', path]);
      this.setState({ iframeUrl: `./container.html#${fragment}` });
    }).catch(reason => {
      alert(reason);
      this.setMode('stopped');
    });
  }

  onPlayPause() {
    switch (this.state.mode) {
      case 'compiling':
        return; // should never happen
      case 'stopped':
        return this.compile();
      case 'running':
        this.setMode('paused');
        this.iframe!.contentWindow.postMessage({ type: 'pause' }, '*');
        return;
      case 'paused':
        this.iframe!.contentWindow.postMessage({
          type: 'continue',
          breakpoints: this.state.breakpoints
        }, '*');
        this.setState({ mode: 'running' });
        return;
    }
  }

  onStep() {
    if (this.state.mode !== 'paused') {
      return;
    }
    this.iframe!.contentWindow.postMessage({ type: 'step' }, '*');
  }

  onStop() {
    switch (this.state.mode) {
      case 'compiling':
        this.setState({ iframeUrl: undefined });
        break;
      case 'running':
        this.iframe!.contentWindow.postMessage({ type: 'pause' }, '*');
        break;
      case 'stopped':
      case 'paused':
    }
    this.setMode('stopped');
  }

  componentWillReceiveProps(nextProps: { language: string }) {
    // When the language changes, we stop the program and clear the output
    // and breakpoints.
    this.setState({ mode: 'stopped', iframeUrl: undefined, breakpoints: [] });
  }

  // componentWillUpdate(nextProps: { language: string }, nextState: StopifyEditorState) {
  //   if (this.props.language !=== this.props.language) {
      
  //   if (this.state.mode !===
  // }
  
  shouldComponentUpdate(nextProps: { language: string }, nextState: StopifyEditorState): boolean {
    return (
      this.state.mode !== nextState.mode ||
      this.state.line !== nextState.line ||
      this.state.iframeUrl !== nextState.iframeUrl ||
      this.props.language !== nextProps.language);
  }

  playPauseText() {
    const mode = this.state.mode;
    if (mode === 'stopped' || mode === 'paused') {
      return 'glyphicon glyphicon-play';
    }
    else {
      return 'glyphicon glyphicon-pause';
    }
  }

  render() {
    // The "key" in the iframe is unique and forces a full reload.
    const iframe = this.state.iframeUrl
      ? <iframe
           key={this.state.iframeUrl}
           ref={(frame) => this.iframe = frame}
           src={this.state.iframeUrl}
           width='100%'
           height='100%'
           style={{border: 'none'}}>
        </iframe>
      : <div>Click <span className='glyphicon glyphicon-play'></span> to run.</div>;
    return <div className="row display-flex">
      <div className="col-md-3">
        <p>This is an experimental, web-based code editor that lets you run
        programs, gracefully stop non-terminating programs, set breakpoints, and
        step through code <i>entirely in the browser</i>.</p>

        <p>This editor is a technology demo for <b>Stopify</b>, a project to
        make JavaScript a better language for compilers and web-based
        programming tools. Most compilers that produce JavaScript inherit the
        limitations of web. For example, long-running programs must be broken
        into short events to keep the browser tab happy. Similarly, most web-based
        code editors cannot gracefully handle non-terminating programs.</p>

        <p>Stopify addresses these issues in an (almost) language-neutral way.
        We use existing compilers to translate source languages to JavaScript.
        Stopify then instruments the JavaScript produced to support stopping,
        stepping, and breakpointing. </p>
      </div>
      <div className="col-md-5">
        <div>
        <GlyphButton
          onclick={this.onPlayPause.bind(this)}
          glyph={this.playPauseText()}
          disabled={this.state.mode === 'compiling'}
          text=""></GlyphButton>
        <GlyphButton
          onclick={this.onStep.bind(this)}
          glyph="glyphicon-step-forward"
          disabled={this.state.mode !== 'paused'}
          text=""></GlyphButton>
        <GlyphButton
          onclick={this.onStop.bind(this)}
          glyph="glyphicon-stop"
          disabled={this.state.mode === 'stopped'}
          text=""></GlyphButton>
        </div>
        <StopifyAce line={this.state.line}
          onChange={this.setProgram.bind(this)}
          onBreakpoints={this.setBreakpoints.bind(this)}
          language={this.props.language}>
        </StopifyAce>
      </div>
      <div className="col-md-3">
        <div style={{height: "100%"}}>{iframe}</div>
      </div>
    </div>;
  }
}

interface GlyphButtonProps {
  onclick?: () => void,
  glyph: string,
  text: string,
  disabled: boolean
}
class GlyphButton extends React.Component<GlyphButtonProps, {}> {
  constructor(props: GlyphButtonProps) {
    super(props)
  }

  render() {
    return (
      <button
         className="btn btn-default"
         type='button'
         disabled={this.props.disabled}
         onClick={() => this.props.onclick && this.props.onclick()}>
        <span className={'glyphicon ' + this.props.glyph}></span>
        {this.props.text}
      </button>);
  }
}

const o = <MultilingualStopifyEditor></MultilingualStopifyEditor>;
render(o, document.getElementById('main')!);
