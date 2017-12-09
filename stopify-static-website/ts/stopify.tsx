import * as React from "react";
import { render } from 'react-dom';
import AceEditor from 'react-ace';
import { StopifyAce } from './StopifyAce';
import * as browser from 'detect-browser'
import * as ace from 'brace';
import { langs } from './languages';
import { encodeArgs } from 'stopify/built/src/browserLine';

type Mode = 'stopped' | 'paused' | 'compiling' | 'running';

class MultilingualStopifyEditor extends React.Component<{}, {language: string}> {

  constructor(props: { language: string }) {
    super(props);
    this.state = {
      language: 'ScalaJS'
    };
  }

  updateState(event: React.ChangeEvent<HTMLSelectElement>) {
    this.setState({ language: event.target.value });
  }

  render() {
    return [
      <div key="chooseLang" className="row">
        <h3 className="stopify-heading col-md-3">What is Stopify?</h3>
        <div className="col-md-5">
          <span className="dropdown">
            <button className="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
              Choose a Language
              <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
              <li><a href="#" onClick={() => this.setState({ language: 'Python' })}>Python</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'ScalaJS' })}>Scala</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'OCaml' })}>OCaml</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'Cpp' })}>C++</a></li>
              <li><a href="#" onClick={() => this.setState({ language: 'ClojureScript' })}>Clojure</a></li>
            </ul>
          </span>
        </div>
        <div className="col-md-3"></div>
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
  rhs: { type: 'iframe', url: string } | { type: 'message', text: string }
}

class StopifyEditor extends React.Component<{ language: string }, StopifyEditorState> {

  static compileMessage = 'Click "Run" to compile and run.';

  private iframe: HTMLIFrameElement | null = null;

  constructor(props: { language: string }) {
    super(props);
    // editor.getSession().setMode(langs[props.language].aceMode);
    // if (lastLineMarker !== null) {
    //   editor.session.removeMarker(lastLineMarker);
    // }
    this.state = {
      mode: 'stopped',
      program: langs[props.language].defaultCode,
      breakpoints: [],
      line: null,
      rhs: { type: 'message', text: StopifyEditor.compileMessage }
    };

    window.addEventListener('message', evt => {
      // Message could be from somethign else, e.g., React DevTools
      if (this.iframe === null || evt.source !== this.iframe.contentWindow) {
        return;
      }
      if (evt.data.type === 'ready') {
        if (this.state.mode === 'compiling') {
          this.setState({ mode: 'running' });
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

  setBreakpoints(breakpoints: number[]) {
    this.setState({ breakpoints });
  }

  compile() {
    this.setState({ mode: 'compiling' });
    // if (lastLineMarker !== null) {
    //   editor.session.removeMarker(lastLineMarker);
    // }
    fetch(new Request(langs[this.props.language].compileUrl, {
      method: 'POST',
      body: this.state.program,
      mode: 'cors'
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
      this.setState({
        rhs: { type: 'iframe', url: `./container.html#${fragment}` }
      });
    }).catch(reason => {
      this.setState({
        mode: 'stopped',
        rhs: { type: 'message', text: reason }
      });
    });
  }

  onPlayPause() {
    switch (this.state.mode) {
      case 'compiling':
        return; // should never happen
      case 'stopped':
        return this.compile();
      case 'running':
        this.setState({ mode: 'paused' });
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
    this.iframe = null;
    this.setState({
      mode: 'stopped',
      rhs: { type: 'message', text: StopifyEditor.compileMessage },
      line: null
    });
  }

  componentWillReceiveProps(nextProps: { language: string }) {
    // When the language changes, we stop the program and clear the output
    // and breakpoints.
    this.setState({
      mode: 'stopped',
      rhs: { type: 'message', text: StopifyEditor.compileMessage },
      breakpoints: []
    });
    if (this.props.language !== nextProps.language) {
      this.setState({ program: langs[nextProps.language].defaultCode });
    }
  }

  // componentWillUpdate(nextProps: { language: string }, nextState: StopifyEditorState) {
  //   if (this.props.language !=== this.props.language) {

  //   if (this.state.mode !===
  // }

  shouldComponentUpdate(nextProps: { language: string }, nextState: StopifyEditorState): boolean {
    return (
      this.state.mode !== nextState.mode ||
      this.state.line !== nextState.line ||
      this.state.rhs !== nextState.rhs ||
      this.props.language !== nextProps.language);
  }

  playPauseText() {
    const mode = this.state.mode;
    if (mode === 'stopped' || mode === 'paused') {
      return 'Run';
    }
    else {
      return 'Pause'
    }
  }

  stepSupported(): boolean {
    return langs[this.props.language].stepSupported;
  }

  render() {
    let rhs: JSX.Element;
    if (this.state.rhs.type === 'message') {
      const lines = this.state.rhs.text.split('\n')
        .map((line, index) => <div key={index}>{line}</div>);
      rhs = <div>{lines}</div>;
    }
    else {
      // The "key" in the iframe is unique and forces a full reload.
     rhs = <iframe key={this.state.rhs.url} ref={(frame) => this.iframe = frame}
                   src={this.state.rhs.url} width='100%' height='100%'
                   style={{border: 'none', overflow: 'hidden'}}>
           </iframe>;
    }
    return <div className="row display-flex">
      <div className="col-md-3 information">

        <p>This is a demo of Stopify, a JavaScript-to-JavaScript compiler that
        makes it possible for other compilers and Web-based IDEs to gracefully
        run long-running programs, stop non-terminating programs, support
        blocking I/O, set breakpoints, and step through code <i>entirely
        in the browser</i>. To demonstrate, this demo applies Stopify to the
        JavaScript output by several existing compilers without making changes
        to the compilers themselves. We showcase programs that take several
        seconds to run or run forever. These programs would normally freeze your
        browser tab, but Stopify keeps this page responsive and let's you
        gracefully interrupt at any time. For certain languages, Stopify
        even supports setting breakpoints and single-stepping. The FAQ
        and Source Code provide more information and discuss how to use
        Stopify to enhance your compiler or IDE.
        </p>
      </div>
      <div className="col-md-5">
        <div>
        <GlyphButton
          onclick={this.onPlayPause.bind(this)}
          glyph=""
          disabled={this.state.mode === 'compiling'}
          text={this.playPauseText()}
          kind="btn-primary"></GlyphButton>
        {this.stepSupported() ?
          <GlyphButton
            onclick={this.onStep.bind(this)}
            glyph=""
            disabled={this.state.mode !== 'paused'}
            text="Step"
            kind="btn-warning"></GlyphButton>
          : <div></div>}
        <GlyphButton
          onclick={this.onStop.bind(this)}
          glyph=""
          disabled={this.state.mode === 'stopped'}
          text="Stop"
          kind="btn-danger"></GlyphButton>
        </div>
        <StopifyAce line={this.state.line}
          onChange={(code) => this.setState({ program: code })}
          onBreakpoints={this.setBreakpoints.bind(this)}
          value={this.state.program}
          language={this.props.language}>
        </StopifyAce>
      </div>
      <div className="col-md-3" id="output" style={{overflow: "hidden"}}>
        <div style={{height: "100%"}}>{rhs}</div>
      </div>
    </div>;
  }
}

interface GlyphButtonProps {
  onclick?: () => void,
  glyph: string,
  text: string,
  disabled: boolean,
  kind: string
}
class GlyphButton extends React.Component<GlyphButtonProps, {}> {
  constructor(props: GlyphButtonProps) {
    super(props)
  }

  render() {
    return (
      <button
         className={`${this.props.kind} btn btn-default col-md-2 ide-button`}
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
