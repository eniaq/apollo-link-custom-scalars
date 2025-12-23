/**
 * @hidden
 * @ignore
 */
export function mapIfArray<TOther, TItem, TResponse>(
  value: TOther | TItem[],
  fn: (x: TItem) => TResponse
): TOther | TResponse[] {
  return Array.isArray(value) ? value.map(fn) : value;
}
