let compareCollator: Intl.Collator | undefined;
export function compareIgnoreCase(a: string, b: string): 0 | -1 | 1 {
  if (compareCollator == null) {
    compareCollator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  }

  const result = compareCollator.compare(a, b);
  // Intl.Collator.compare isn't guaranteed to always return 1 or -1 on all platforms so normalize it
  return result === 0 ? 0 : result > 0 ? 1 : -1;
}
