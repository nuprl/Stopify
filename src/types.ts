export type Stoppable = (isStop: () => boolean, 
                         onStop: () => void,
                         onDone: () => void, 
                         interval: number,
                         args: string[]) => void
