export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge' | 'lazyDeep';
export type HandleNew = 'direct' | 'wrapper'

export interface CompilerOpts {
  // required
  getters: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful',
  requireRuntime: boolean,
  noWebpack: boolean,

  // optional
  sourceMap?: any
  compileFunction?: boolean,
}

