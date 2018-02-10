export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper'

export interface CompilerOpts {
  compileFunction: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful',
  requireRuntime: boolean,
  noWebpack: boolean,
  sourceMap?: any
}

