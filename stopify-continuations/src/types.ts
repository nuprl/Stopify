export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper'

export interface Opts {
  transform: CaptureMethod,
  filename: string,
  requireRuntime: boolean,
}

export interface CompilerOpts {
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful',
  requireRuntime: boolean,
}

