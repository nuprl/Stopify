export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: Opts) => void

export interface Opts {
  filename: string,
  yieldMethod: 'fixed' | 'flexible';
  yieldInterval: number,
  stop: number | undefined,
  env: 'browser' | 'node',
  variance: boolean
}
