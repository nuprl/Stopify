export interface Stack<T> {
  length: number;
  array: T[];

  push(element: T): void;
  pop(): T;
  unshift(element: T): void;
  shift(): T;
  peek(): T;
  [Symbol.iterator](): Iterator<T>;
}

export class PushPopStack<T> implements Stack<T> {
  public array: T[];
  public length: number;

  [Symbol.iterator](): Iterator<T> {
    let curr = 0;

    return {
      next() {
        if(curr < length) {
          const ret = this.array[curr];
          curr++;
          return { value: ret, done: false };
        }
        else {
          return { value: undefined as any, done: true };
        }
      }
    }
  }

  constructor(sizeHint: number, initArray?: T[]) {
    this.array = initArray ? initArray : Array(sizeHint);
    this.length = 0;
  }

  push(element: T): void {
    this.array[this.length] = element;
    this.length++;
  }

  pop(): T {
    this.length--;
    const ret = this.array[this.length];
    this.array[this.length] = <any>undefined;
    return ret as T;
  }

  peek(): T {
    return this.array[this.length - 1] as T;
  }

  shift(): T {
    throw new Error('PushPopStack does not implement shift');
  }

  unshift(element: T): void {
    throw new Error('PushPopStack does not implement unshift');
  }

}

export class GeneralStack<T> implements Stack<T> {
  length: number;
  public array: T[];

  constructor(sizeHint: number, initArray?: T[]) {
    this.array = initArray ? initArray : [];
  }

  [Symbol.iterator]() {
    return this.array[Symbol.iterator]() as Iterator<T>;
  }

  push(element: T): void {
    this.array.push(element);
  }

  pop(): T {
    return this.array.pop() as T;
  }

  unshift(element: T): void {
    this.array.unshift(element);
  }

  shift(): T {
    return this.array.shift() as T;
  }

  peek(): T {
    return this.array[this.array.length - 1] as T;
  }
}
