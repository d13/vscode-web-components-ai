export function areEqual(a?: Set<any>, b?: Set<any>): boolean {
  if (!a || !b) return false;
  if (a.size !== b.size) return false;

  for (const item of a) {
    if (!b.has(item)) return false;
  }

  return true;
}
