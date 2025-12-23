/**
 * @hidden
 * @ignore
 */
export function isNone(x: unknown): x is null | undefined {
  return x === undefined || x === null;
}
