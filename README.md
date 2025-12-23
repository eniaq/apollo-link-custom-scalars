# apollo-link-custom-scalars

Custom Apollo Link to parse custom scalars from responses and serialize custom scalars in inputs for Apollo Client v4.

If you are using Apollo Client v2 or v3, please use the original library instead:
https://github.com/eturino/apollo-link-scalars

## Installation

```sh
npm install apollo-link-custom-scalars graphql
```

## Usage

We need to pass a `GraphQLSchema`, and optionally we can also pass a map of custom serialization/parsing functions for specific types.

You can build the link by calling the `withScalars()` function, passing to it the `schema` and optionally a `typesMap`.

```typescript
import { withScalars } from "apollo-link-custom-scalars";
import { ApolloLink, HttpLink } from "@apollo/client";
import { schema } from "./my-schema";

const link = ApolloLink.from([
  withScalars({ schema }),
  new HttpLink({ uri: "http://example.org/graphql" })
]);

// we can also pass a custom map of functions. These will have priority over the GraphQLTypes parsing and serializing functions from the Schema.
const typesMap = {
  CustomScalar: {
    serialize: (parsed: unknown): string | null =>
      parsed instanceof CustomScalar ? parsed.toString() : null,
    parseValue: (raw: unknown): CustomScalar | null => {
      if (!raw) return null; // if for some reason we want to treat empty string as null, for example
      if (isString(raw)) {
        return new CustomScalar(raw);
      }

      throw new Error("invalid value to parse");
    }
  }
};

const link2 = ApolloLink.from([
  withScalars({ schema, typesMap }),
  new HttpLink({ uri: "http://example.org/graphql" })
]);
```

### Options

We can pass extra options to `withScalars()` to modify the behaviour

- **`removeTypenameFromInputs`** (`Boolean`, default `false`): when enabled, it will remove from the inputs the `__typename` if it is found. This could be useful if we are using data received from a query as an input on another query.
- **`validateEnums`** (`Boolean`, default `false`): when enabled, it will validate the enums on parsing, throwing an error if it sees a value that is not one of the enum values.
- **`nullFunction`** (`NullFunction`, default `null`): by passing a set of transforms on how to box and unbox null types, you can automatically construct e.g. Maybe monads from the null types. See below for an example.

```typescript
withScalars({
  schema,
  typesMap,
  validateEnums: true,
  removeTypenameFromInputs: true
});
```

### Example of loading a schema

```typescript
import { gql } from "@apollo/client";
import { GraphQLScalarType, Kind } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

// GraphQL Schema definition.
const typeDefs = gql`
  type Query {
    myList: [MyObject!]!
  }

  type MyObject {
    day: Date
    days: [Date]!
    nested: MyObject
  }

  "represents a Date with time"
  scalar Date
`;

const resolvers = {
  // example of scalar type, which will parse the string into a custom class CustomDate which receives a Date object
  Date: new GraphQLScalarType({
    name: "Date",
    serialize: (parsed: CustomDate | null) => parsed && parsed.toISOString(),
    parseValue: (raw: unknown) => raw && new CustomDate(new Date(raw)),
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
        return new CustomDate(new Date(ast.value));
      }
      return null;
    }
  })
};

// GraphQL Schema, required to use the link
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});
```

#### Synchronously creating a link instance with [`graphql-code-generator`](https://graphql-code-generator.com/) setup

> Warning: Be sure to watch your bundle size and know what you are doing.

Codegen config to generate introspection data:

`codegen.yml`

```yaml
---
generates:
  src/__generated__/graphql.schema.json:
    plugins:
      - "introspection"
    config:
      minify: true
```

Synchronous code to create link instance in common scenario:

```typescript
import introspectionResult from "./__generated__/graphql.schema.json";
import { buildClientSchema, IntrospectionQuery } from "graphql";

const schema = buildClientSchema(introspectionResult);
// note: sometimes it seems to be needed to cast it as Introspection Query
// `const schema = buildClientSchema((introspectionResult as unknown) as IntrospectionQuery)`

const scalarsLink = withScalars({
  schema,
  typesMap: {
    /* ... */
  }
});
```

#### Changing the behaviour of nullable types

By passing the `nullFunctions` parameter to `withScalar`, you can change the way that nullable types are handled. The default implementation will leave them exactly as is, i.e. `null` => `null` and `value` => `value`. If instead, you e.g. wish to transform nulls into a Maybe monad, you can supply functions corresponding to the following type. The examples below are based on the Maybe monad from [Seidr](https://github.com/hojberg/seidr) but any implementation will do.

```typescript
type NullFunctions = {
  serialize(input: unknown): unknown | null;
  parseValue(raw: unknown | null): unknown;
};

const nullFunctions: NullFunctions = {
  parseValue(raw: unknown) {
    if (isNone(raw)) {
      return Nothing();
    } else {
      return Just(raw);
    }
  },
  serialize(input: unknown) {
    return input.caseOf({
      Just(value) {
        return value;
      },
      Nothing() {
        return null;
      }
    });
  }
};
```

The `nullFunctions` are executed after the normal parsing/serializing. The normal parsing/serializing functions are not called for `null` values.

Both in parsing and serializing, we have the following logic (in pseudocode):

```ts
if (isNone(value)) {
  return this.nullFunctions.serialize(value);
}

const serialized = serializeNonNullValue(value);
return this.nullFunctions.serialize(serialized);
```

```ts
if (isNone(value)) {
  return this.nullFunctions.parseValue(value);
}

const parsed = parseNonNullValue(value);
return this.nullFunctions.parseValue(parsed);
```

## Acknowledgment

This library is based on the original `apollo-link-scalars` implementation by Eduardo Turiño.
Please see https://github.com/eturino/apollo-link-scalars

## License

MIT
