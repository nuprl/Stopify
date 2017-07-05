export type FVSet<A> = A[];

export function fvSetOfArray<A>(arr: A[]): FVSet<A> {
  return arr;
}

export function copyFVSet<A>(fvs: FVSet<A>): FVSet<A> {
  return fvs.map(x => x);
}

export function empty<A>(): A[] {
  return [];
}

export function singleton<A>(a: A): A[] {
  return [a];
}

export function add<A>(a: A, s: A[]): A[] {
  if (s.includes(a)) {
    return s;
  } else {
    s.push(a);
    return s;
  }
}

export function union<A>(a: A[], b: A[]): A[] {
  return [...a].reduce((s, x) => add(x, s), b);
}

export function diff<A>(a: A[], b: A[]): A[] {
  return [...a].filter(x => !b.includes(x));
}

export function intersect<A>(a: A[], b: A[]): A[] {
  return [...a].filter(x => b.includes(x));
}

export function size<A>(s: A[]): number {
  return s.length;
}

export function remove<A>(a: A, s: A[]): A[] {
  const idx = s.indexOf(a);
  if (idx !== -1) {
    s.splice(idx, 1);
  }
  return s;
}

