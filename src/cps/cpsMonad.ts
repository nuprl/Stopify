export class CPS<A,R> {
  constructor(private m: (k: (a: A) => R) => R) {}

  bind<B>(f: (a: A) => CPS<B,R>): CPS<B,R> {
    return new CPS((k: ((b: B) => R)) => this.m((a: A) => f(a).m(k)));
  }

  map<B>(f: (a: A) => B): CPS<B,R> {
    return new CPS((k: (b: B) => R) => this.m((a: A) => k(f(a))));
  }

  apply(f: (a: A) => R): R {
    return this.m(f);
  }
};

export function ret<A,R>(a: A): CPS<A,R> {
  return new CPS((k: ((a: A) => R)) => k(a));
};
