import { ApolloLink, DocumentNode, execute, gql } from "@apollo/client";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphql } from "graphql";
import { withScalars } from "../src/index";
import { observableOf, nextValue, dummyClient } from "./test-utils";

describe("skip directive on non-nullable field", () => {
  const typeDefs = gql`
    type Query {
      item: Item!
    }

    type Item {
      title: String
      subItem: Item!
    }
  `;

  const resolvers = {
    Query: {
      item: () => ({})
    }
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  const querySource = `
    query MyQuery($skip: Boolean!) {
      item1: item @skip(if: $skip) {
        title
      }
        item2: item {
        title
        subItem @skip(if: $skip) {
          title
        }
      }
    }
`;

  const queryDocument: DocumentNode = gql`
    ${querySource}
  `;

  const request = {
    context: { client: dummyClient },
    query: queryDocument,
    variables: { skip: true }
  };

  const response = {
    data: {
      item2: {
        title: null
      }
    }
  };

  it("ensure the response fixture is valid", async () => {
    expect.assertions(1);
    const queryResponse = await graphql({
      schema,
      source: querySource,
      variableValues: { skip: true }
    });
    expect(queryResponse).toEqual(response);
  });

  it("disregards field type non-nullability", async () => {
    const link = ApolloLink.from([
      withScalars({ schema }),
      new ApolloLink(() => {
        return observableOf(response);
      })
    ]);
    const expectedResponse = {
      data: {
        item2: {
          title: null
        }
      }
    };

    const observable = execute(link, request, { client: dummyClient });
    const value = await nextValue(observable);
    expect(value).toEqual(expectedResponse);
    expect.assertions(1);
  });
});
