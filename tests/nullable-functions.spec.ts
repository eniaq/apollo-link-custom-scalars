import { ApolloLink, DocumentNode, execute, gql } from "@apollo/client";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { withScalars } from "../src/index";
import { isNone } from "../src/lib/is-none";
import { NullFunctions } from "../src/types/null-functions";
import { observableOf, nextValue, dummyClient } from "./test-utils";

describe("nullable-functions", () => {
  const typeDefs = gql`
    type Query {
      exampleNullableArray: [String!]
      exampleNullableNestedArray: [String]
      nonNullObject: ExampleObject!
      nullObject: ExampleObject
    }

    type ExampleObject {
      nullField: String
      nonNullField: String!
    }

    type MyInput {
      nullField: String
    }
  `;

  const schema = makeExecutableSchema({ typeDefs });

  const queryDocument: DocumentNode = gql`
    query MyQuery($input: MyInput!) {
      exampleNullableArray
      exampleNullableNestedArray
      nonNullObject {
        nullField
        nonNullField
      }
      nullObject {
        nullField
        nonNullField
      }
    }
  `;

  const responseWithNulls = {
    data: {
      exampleNullableArray: null,
      exampleNullableNestedArray: [null],
      nonNullObject: {
        nullField: null,
        nonNullField: "a"
      },
      nullObject: null
    }
  };

  const responseWithoutNulls = {
    data: {
      exampleNullableArray: ["a"],
      exampleNullableNestedArray: [null, "b"],
      nonNullObject: {
        nullField: "c",
        nonNullField: "d"
      },
      nullObject: {
        nullField: "e",
        nonNullField: "f"
      }
    }
  };

  describe("with default null functions", () => {
    const request = {
      context: { client: dummyClient },
      query: queryDocument,
      variables: { input: { nullField: "a" } }
    };
    it("parses nulls correctly", async () => {
      const link = ApolloLink.from([
        withScalars({ schema }),
        new ApolloLink(() => {
          return observableOf(responseWithNulls);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const result = await nextValue(observable);
      expect(result).toEqual(responseWithNulls);
    });

    it("parses non-nulls correctly", async () => {
      const link = ApolloLink.from([
        withScalars({ schema }),
        new ApolloLink(() => {
          return observableOf(responseWithoutNulls);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const result = await nextValue(observable);
      expect(result).toEqual(responseWithoutNulls);
    });
  });

  describe("with custom null functions", () => {
    type Maybe<T> = {
      typename: "just" | "nothing";
      value?: T;
    };

    const request = {
      context: { client: dummyClient },
      query: queryDocument,
      variables: { input: { nullField: { typename: "just", value: "a" } } }
    };

    const nullFunctions: NullFunctions = {
      parseValue(raw: any): Maybe<any> {
        if (isNone(raw)) {
          return {
            typename: "nothing"
          };
        } else {
          return {
            typename: "just",
            value: raw
          };
        }
      },
      serialize(input: any) {
        if (input.typename === "just") {
          return input.value;
        } else {
          return null;
        }
      }
    };
    it("parses nulls correctly", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, nullFunctions }),
        new ApolloLink(() => {
          return observableOf(responseWithNulls);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const result = await nextValue(observable);
      expect(result).toEqual({
        data: {
          exampleNullableArray: { typename: "nothing" },
          exampleNullableNestedArray: { typename: "just", value: [{ typename: "nothing" }] },
          nonNullObject: {
            nullField: { typename: "nothing" },
            nonNullField: "a"
          },
          nullObject: { typename: "nothing" }
        }
      });
    });

    it("parses non-nulls correctly", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, nullFunctions }),
        new ApolloLink(() => {
          return observableOf(responseWithoutNulls);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const result = await nextValue(observable);
      expect(result).toEqual({
        data: {
          exampleNullableArray: { typename: "just", value: ["a"] },
          exampleNullableNestedArray: {
            typename: "just",
            value: [{ typename: "nothing" }, { typename: "just", value: "b" }]
          },
          nonNullObject: {
            nullField: { typename: "just", value: "c" },
            nonNullField: "d"
          },
          nullObject: {
            typename: "just",
            value: {
              nullField: { typename: "just", value: "e" },
              nonNullField: "f"
            }
          }
        }
      });
    });
  });
});
