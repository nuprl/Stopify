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

export function timeSlow<T>(label: string, thunk: () => T): T {
  const start = Date.now();
  const result = thunk();
  const end = Date.now();
  const delay = end - start;
  if (delay > 2000) {
    console.info(`${label} (${delay} ms)`);
  }
  return result;
}

export function groupBy<T>(inGroup: (x: T, y: T) => boolean, arr: T[]): T[][] {
  if (arr.length === 0) {
    return [];
  }

  const groups = [[arr[0]]];
  let currentGroup = groups[0];
  let last = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    if (inGroup(last, current)) {
      currentGroup.push(current);
      last = current;
    }
    else {
      currentGroup = [current];
      groups.push(currentGroup);
      last = current;
    }
  }
  return groups;
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

export function unreachable(): never {
  throw new Error("unreachable code was reached!");
}
