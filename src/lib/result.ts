/**
 * Typed Result pattern for boundary error handling without exceptions.
 */

export type Ok<T> = {
  readonly success: true;
  readonly data: T;
};

export type Err<E> = {
  readonly success: false;
  readonly error: E;
};

export type Result<T, E = Error> = Ok<T> | Err<E>;

export const Result = {
  ok<T>(data: T): Ok<T> {
    return { success: true, data };
  },

  err<E>(error: E): Err<E> {
    return { success: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.success;
  },

  isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return !result.success;
  },

  map<T, U, E>(result: Result<T, E>, fn: (val: T) => U): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw (result.error instanceof Error) ? result.error : new Error(String(result.error));
  },
};
