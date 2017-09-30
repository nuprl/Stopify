export function sum(arr: number[]): number {
  return arr.reduce((x, y) => x + y, 0);
}

export function dropWhile<T>(f: (elt: T) => boolean, arr: T[]): T[] {
  for (let i = 0; i < arr.length; i++) {
    if (f(arr[i]) === false) {
      return arr.slice(i);
    }
  }
  return [];
}

export function takeWhile<T>(f: (elt: T) => boolean, arr: T[]): T[] {
  for (let i = 0; i < arr.length; i++) {
    if (f(arr[i]) === false) {
      return arr.slice(0, i);
    }
  }
  return arr.slice(0);
}

export function time<T>(label: string, thunk: () => T): T {
  const start = Date.now();
  const result = thunk();
  const end = Date.now();
  console.info(`${label} (${start - end} ms)`);
  return result;
}

export function timeSlow<T>(label: string, thunk: () => T): T {
  const start = Date.now();
  const result = thunk();
  const end = Date.now();
  const delay = end - start;
  if (delay > 5000) {
    console.info(`${label} (${delay} ms)`);
  }
  return result;
}


/** Haskell-style span */
export function span<T>(pred: (elt: T) => boolean, arr: T[]): { prefix: T[], suffix: T[] } {
  let i = 0;
  while (i < arr.length && pred(arr[i])) {
    i = i + 1;
  }
  return { prefix: arr.slice(0, i), suffix: arr.slice(i) }
}

export function groupBy<T>(inGroup: (x: T, y: T) => boolean, arr: T[]): T[][] {
  if (arr.length === 0) {
    return [];
  }
  else {
    const [x, ...xs]  = arr;
    const { prefix: ys, suffix: zs } = span((y) => inGroup(x, y), xs);
    return [[x, ...ys], ...groupBy(inGroup, zs)];
  }
}

export function parseArg<T>(
  convert: (arg: string) => T,
  validate: (parsed: T) => boolean,
  error: string): (arg: any) => any {
  return (arg: any) => {
    const parsed = convert(arg);
    if (validate(parsed)) {
      return parsed;
    }
    else {
      throw new Error(error);
    }
  };
}
