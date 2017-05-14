// Interface server expects to communicate to compiler backend.
export interface CompilerSupport {
  // `tmpDir` is to be set as the working directory for the compiler
  // `code` is the source code received from a client
  // `jsReceiver` responds to the request with the compiler output
  compile(tmpDir: string,
    code: string,
    jsReceiver: (code: string) => any): void;
}

// Supported languages implementing the compiler interface:
export interface OCaml extends CompilerSupport {}
export interface ClojureScript extends CompilerSupport {}
