import { Options } from '../common/helpers'
export type stopifyFunction = (code: string, opts: Options) =>
  ($isStop: () => boolean, $onStop: () => void,
    $onDone: () => void, $interval: number) => void

export type stopifyPrint = (code: string, opts: Options) => string
