class Ok<T> {
    public kind: 'ok' = 'ok';
    constructor(public value: T) {
    }

    then<S>(f: (x: T) => Result<S>): Result<S> {
        return f(this.value);
    }

    map<S>(f: (x: T) => S): Result<S> {
        return asResult(() => f(this.value));
    }

    unwrap(): T {
        return this.value;
    }
}

class Error<T> {
    public kind: 'error' = 'error';
    constructor(public message: string) {
    }

    then<S>(f: (x: T) => Result<S>): Result<S> {
        return error(this.message);
    }

    map<S>(f: (x: T) => S): Result<S> {
        return error(this.message);
    }

    unwrap(): T {
        throw new Error(this.message);
    }
}

export function ok<T>(v: T) {
    return new Ok(v);
}

export function error<T>(message: string): Error<T> {
    return new Error(message);
}

export function asResult<T>(f: () => T): Result<T> {
    try {
        return ok(f());
    }
    catch (exn) {
        return error(exn.toString());
    }
}

/**
 * A Result abstraction, similar to the Result type in Rust or or the Error
 * monad in Haskell. Unlike those languages, where the type of the error is
 * a type parameter, we require all errors to be strings.
 */
export type Result<T> = Ok<T> | Error<T>;
