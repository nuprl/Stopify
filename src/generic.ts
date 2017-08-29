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
