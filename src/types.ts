export type Stoppable = (isStop: () => boolean, 
                         onStop: () => void,
                         onDone: () => void, 
                         interval: number) => void
