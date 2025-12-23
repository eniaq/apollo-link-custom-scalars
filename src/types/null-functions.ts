export type NullFunctions = {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  serialize(input: unknown): unknown | null;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  parseValue(raw: unknown | null): unknown;
};
