import * as React from 'react';
import * as ReactDOM from 'react-dom';
// import Index from './mainPage';
import MonacoEditor from 'react-monaco-editor';
import { Hook, Console, Decode } from 'console-feed';
import { compile } from 'stopify-continuations-compiler';
import * as t from 'babel-types';
import * as continuationsRTS from 'stopify-continuations';

function appendLog(msg: any) {
    return function(prevState: { logs: any[] }) {
        console.log(msg);
        return {
            logs: [...prevState.logs, {
                method: 'log',
                data: [msg]
            }]
        };
    };
}

class ContinuationsPlayground extends React.Component<{}, { logs: any[] }> {

    private code: string;
    constructor(props: {}) {
        super(props);
        this.code = window.localStorage.getItem('code') || "";
        this.state = { logs: [] };
    }

    onRun() {

        // The variables below are used by the eval'd code.
        // @ts-ignore
        let globals = {
            console: {
                log: (msg: any) => this.setState(appendLog(msg))
            },
            control: function(f: any) {
                const rts = continuationsRTS.newRTS('lazy');
                return rts.captureCC(k => {
                    return f((x: any) => k({ type: 'normal', value: x }));
                });
            }
        };
        // @ts-ignore
        const stopify = continuationsRTS;
        const compiledCode = compile(this.code, t.identifier('globals'));
        if (compiledCode.kind === 'error') {
            globals.console.log(compiledCode.message);
            return;
        }
        window.localStorage.setItem('code', this.code);
        eval(compiledCode.value);
    }

    render() {
        return (
            <div style={{ display: 'grid', height: '100vh', width: '100vw',
                          gridTemplateColumns: '1fr 1fr',
                          gridColumnGap: '2px' }}>
                <div style={{gridRowStart: 1, gridColumnStart: 1}}>
                    <button onClick={() => this.onRun()}>
                        Run
                    </button>
                </div>
                <div style={{ gridColumnStart: 1, gridColumnEnd: 1, gridRowStart: 2 }}>
                    <MonacoEditor
                        onChange = { (newValue) => this.code = newValue }
                        language="javascript"
                        theme="vs-dark"
                        value={this.code}
                        options={ { automaticLayout: true } }
                        >
                    </MonacoEditor>
                </div>
            <div style={{ gridColumnStart: 2, gridColumnEnd: 2, gridRowStart: 2 }}>
                <div style={{height: "100%", backgroundColor: '#242424' }}>
                <Console variant="dark" logs={this.state.logs}/>
                </div>
            </div>
        </div>);
    }

}
ReactDOM.render(
    <ContinuationsPlayground/>,
    document.querySelector('#root')
);
