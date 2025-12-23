import { ApolloLink, DocumentNode, execute, gql } from "@apollo/client";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphql, GraphQLError } from "graphql";
import { withScalars } from "../src/index";
import { observableOf, nextValue, dummyClient } from "./test-utils";

describe("enum returned directly from first level queries", () => {
  const typeDefs = gql`
    type Query {
      first: MyEnum
      second: MyEnum!
      third: MyEnum
    }

    enum MyEnum {
      a
      b
      c
    }
  `;

  const resolvers = {
    Query: {
      first: () => "a",
      second: () => "b",
      third: () => null
    }
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  const querySource = `
  query MyQuery {
    first
    second
    third
    otherFirst: first
    otherSecond: second
    otherThird: third
  }
`;

  const queryDocument: DocumentNode = gql`
    ${querySource}
  `;

  const request = {
    context: { client: dummyClient },
    query: queryDocument,
    variables: {}
  };

  const validResponse = {
    data: {
      first: "a",
      second: "b",
      third: null,
      otherFirst: "a",
      otherSecond: "b",
      otherThird: null
    }
  };

  const invalidResponse = {
    data: {
      first: "a",
      second: "b",
      third: null,
      otherFirst: "invalid",
      otherSecond: "b",
      otherThird: null
    }
  };

  it("ensure the response fixture is valid (ensure that in the response we have the RAW, the Server is converting from Date to STRING)", async () => {
    expect.assertions(1);
    const queryResponse = await graphql({ schema, source: querySource });
    expect(queryResponse).toEqual(validResponse);
  });

  describe("with valid enum values", () => {
    it("validateEnums false (or missing) => return response", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, validateEnums: false }),
        new ApolloLink(() => {
          return observableOf(validResponse);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const value = await nextValue(observable);
      expect(value).toEqual(validResponse);
      expect.assertions(1);
    });

    it("validateEnums false (or missing) => return response", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, validateEnums: true }),
        new ApolloLink(() => {
          return observableOf(validResponse);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const value = await nextValue(observable);
      expect(value).toEqual(validResponse);
      expect.assertions(1);
    });
  });

  describe("with invalid enum values", () => {
    it("validateEnums false (or missing) => return invalid response", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, validateEnums: false }),
        new ApolloLink(() => {
          return observableOf(invalidResponse);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const value = await nextValue(observable);
      expect(value).toEqual(invalidResponse);
      expect.assertions(1);
    });

    it("validateEnums true => return error", async () => {
      const link = ApolloLink.from([
        withScalars({ schema, validateEnums: true }),
        new ApolloLink(() => {
          return observableOf(invalidResponse);
        })
      ]);

      const observable = execute(link, request, { client: dummyClient });
      const value = await nextValue(observable);
      expect(value).toEqual({
        errors: [new GraphQLError(`enum "MyEnum" with invalid value`)]
      });
      expect.assertions(1);
    });
  });
});
