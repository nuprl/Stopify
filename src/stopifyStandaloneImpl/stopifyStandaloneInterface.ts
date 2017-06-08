export type stopifyFunction = (code: string) =>
  ($isStop: () => boolean, $onStop: () => void,
    $onDone: () => void, $interval: number) => void

export type stopifyPrint = (code: string) => string
