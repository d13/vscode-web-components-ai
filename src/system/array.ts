export function unique<T>(source: readonly T[]): T[] {
  return [...new Set(source)];
}

export function sortBy<T, K>(key: (item: T) => K): (a: T, b: T) => number {
  return (a, b) => {
    const aKey = key(a);
    const bKey = key(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  };
}
