// Interface server expects to communicate to compiler backend.
export interface CompilerSupport {
  // `tmpDir` is to be set as the working directory for the compiler
  // `code` is the source code received from a client
  // `jsReceiver` responds to the request with the compiler output
  compile(tmpDir: string,
    code: string,
    jsReceiver: (code: string) => any): void;
}

// Interface providing paws-client support to a language.
export interface CompilerClient {
  aceMode: string,
  defaultCode: string,
  compileUrl: string
}

// Supported languages implementing the compiler interface:
export interface OCaml extends CompilerSupport {}
export interface ClojureScript extends CompilerSupport {}

// Supported languages implementing the client interface:
export interface OCamlClient extends CompilerClient {}
export interface ClojureScriptClient extends CompilerClient {}
