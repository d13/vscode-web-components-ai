export function isPromise<T>(obj: PromiseLike<T> | T): obj is Promise<T> {
  return obj != null && (obj instanceof Promise || typeof (obj as PromiseLike<T>)?.then === 'function');
}
