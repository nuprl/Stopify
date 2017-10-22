// Interface server expects to communicate to compiler backend.
export interface CompilerSupport {
  // `compilerDir` is to be set as the working directory for the compiler
  // `code` is the source code received from a client
  // `jsReceiver` responds to the request with the compiler output
  compile(compilerDir: string,
    code: string,
    jsReceiver: (code: string) => any): void;
}

// Interface providing paws-client support to a language.
export interface CompilerClient {
  aceMode: string,      // `aceMode` is the ace url to the language's mode
                        // (e.g. ace/mode/ocaml)

  defaultCode: string,  // `defaultCode` is the default program loaded into the
                        // editor

  compileUrl: string    // `compileUrl` is the url the server listens on for
                        // POST requests
}

// Supported languages implementing the compiler interface:
export interface OCaml extends CompilerSupport {}
export interface ClojureScript extends CompilerSupport {}
export interface ScalaJSInterface extends CompilerSupport {}
export interface JavaScriptInterface extends CompilerSupport {}
export interface Emscripten extends CompilerSupport {}

// Supported languages implementing the client interface:
export interface OCamlClient extends CompilerClient {}
export interface ClojureScriptClient extends CompilerClient {}
export interface ScalaJSClientInterface extends CompilerClient {}
export interface JavaScriptClientInterface extends CompilerClient {}
export interface EmscriptenClient extends CompilerClient {}
