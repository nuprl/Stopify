"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_ace_1 = require("react-ace");
const ace = require("brace");
const languages_1 = require("./languages");
require('brace/mode/ocaml');
require('brace/mode/c_cpp');
require('brace/mode/clojure');
require('brace/mode/scala');
require('brace/mode/javascript');
require('brace/mode/dart');
require('brace/theme/eclipse');
const Range = ace.acequire('ace/range').Range;
/**
 * Encapsulates an AceEditor that supports setting breakpoints by
 * clicking in the gutter.
 */
class StopifyAce extends React.Component {
    constructor(props) {
        super(props);
        this.breakpoints = [];
        /// Ace Marker object that is kept in sync with props.line.
        this.lastLineMarker = null;
    }
    componentWillReceiveProps(props) {
        if (this.lastLineMarker !== null) {
            this.editor.session.removeMarker(this.lastLineMarker);
        }
        if (props.line) {
            this.lastLineMarker = this.editor.session.addMarker(new Range(props.line, 0, props.line, 1), "myMarker", "fullLine", false);
            this.editor.scrollToLine(props.line, true, false, function () { });
        }
    }
    updateBreakpoints(e) {
        const breakpoints = this.breakpoints;
        const target = e.domEvent.target;
        if (target.className.indexOf("ace_gutter-cell") == -1) {
            return;
        }
        const row = e.getDocumentPosition().row;
        if (breakpoints.includes(row + 1)) {
            this.editor.session.clearBreakpoint(row);
            breakpoints.splice(breakpoints.lastIndexOf(row + 1), 1);
        }
        else {
            this.editor.session.setBreakpoint(row, 'ace_breakpoint');
            breakpoints.push(row + 1);
        }
        this.editor.renderer.updateBreakpoints();
        this.props.onBreakpoints(breakpoints);
        e.stop();
    }
    setupEditor(editor) {
        if (editor === null) {
            return;
        }
        this.editor = editor.editor;
        this.editor.$blockScrolling = Infinity;
        this.editor.setOptions({
            fontSize: "12pt"
        });
        // const code = langs[this.props.language].defaultCode;
        // this.editor.setValue(code);
        // this.props.onChange(code);
        this.editor.on("guttermousedown", (evt) => this.updateBreakpoints(evt));
    }
    render() {
        return React.createElement(react_ace_1.default, { ref: (editor) => this.setupEditor(editor), onChange: (text) => this.props.onChange(text), width: "100%", theme: "eclipse", name: "the_editor", value: this.props.value, mode: languages_1.langs[this.props.language].aceMode });
    }
}
exports.StopifyAce = StopifyAce;
//# sourceMappingURL=StopifyAce.js.map