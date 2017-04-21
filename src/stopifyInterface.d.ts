export interface StopifiedEval {
    start: () => void;
    stop: () => void;
    onDone: (val?: any) => void;
    pause: () => void;
    resume: () => void;
}
