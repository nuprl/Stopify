import * as React from "react";
import AceEditor from 'react-ace';
import * as ace from 'brace';
import { langs } from './languages';
require('brace/mode/ocaml');
require('brace/mode/c_cpp');
require('brace/mode/clojure');
require('brace/mode/scala')
require('brace/mode/javascript')
require('brace/theme/monokai');
const Range = ace.acequire('ace/range').Range;

export interface StopifyAceProps {
  language: string;
  line: number | null;
  value: string,
  onChange: (text: string) => void,
  onBreakpoints: (breakpoints: number[]) => void
}

/**
 * Encapsulates an AceEditor that supports setting breakpoints by
 * clicking in the gutter.
 */
export class StopifyAce extends React.Component<StopifyAceProps, {}> {

  editor: ace.Editor;
  lastLineMarker: number | null;
  breakpoints: number[] = [];
  constructor(props: StopifyAceProps) {
    super(props)
    /// Ace Marker object that is kept in sync with props.line.
    this.lastLineMarker = null;
  }

  componentWillReceiveProps(props: StopifyAceProps) {
    if (this.lastLineMarker !== null) {
      this.editor.session.removeMarker(this.lastLineMarker);
    }
    if (props.line) {
      this.lastLineMarker = this.editor.session.addMarker(
        new Range(props.line, 0, props.line, 1),
        "myMarker", "fullLine", false);
      this.editor.scrollToLine(props.line, true, false, function () {});
    }
  }

  updateBreakpoints(e: any) {
    const breakpoints = this.breakpoints;
    const target = e.domEvent.target;
    if (target.className.indexOf("ace_gutter-cell") == -1) {
      return;
    }
    const row = e.getDocumentPosition().row;
    if (breakpoints.includes(row + 1)) {
      this.editor.session.clearBreakpoint(row);
      breakpoints.splice(breakpoints.lastIndexOf(row + 1), 1);
    } else {
      this.editor.session.setBreakpoint(row,'ace_breakpoint');
      breakpoints.push(row + 1);
    }
    this.editor.renderer.updateBreakpoints();
    this.props.onBreakpoints(breakpoints);
    e.stop();
  }

  setupEditor(editor: any) {
    if (editor === null) {
      return;
    }
    this.editor = editor.editor as ace.Editor;
    this.editor.$blockScrolling = Infinity;
    // const code = langs[this.props.language].defaultCode;
    // this.editor.setValue(code);
    // this.props.onChange(code);
    this.editor.on("guttermousedown", (evt) => this.updateBreakpoints(evt));
  }

  render() {
    return <AceEditor
      ref={(editor) => this.setupEditor(editor)}
      onChange = { (text) => this.props.onChange(text) }
      width="100%"
      theme="monokai"
      name="the_editor"
      value={this.props.value}
      mode={langs[this.props.language].aceMode}>
      </AceEditor>;
  }

}
