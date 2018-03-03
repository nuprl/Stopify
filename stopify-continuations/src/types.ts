export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper'

export interface CompilerOpts {
  compileFunction?: boolean,
  getters: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  eval: boolean,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful' | 'full',
  requireRuntime: boolean,
  sourceMap?: any
}

