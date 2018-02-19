export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper'

export interface CompilerOpts {
  // required
  getters: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  eval: boolean,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful' | 'full',
  requireRuntime: boolean,
  externals: string[]
  sourceMap?: any
  compileFunction?: boolean,
}

