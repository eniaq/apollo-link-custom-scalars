import { ApolloLink, DocumentNode, execute, gql } from "@apollo/client";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { withScalars } from "../src/index";
import { observableOf, nextValue, dummyClient, getOperationName } from "./test-utils";

describe("builtin scalars behave like usual", () => {
  const typeDefs = gql`
    type Query {
      day: String
    }
  `;

  const schema = makeExecutableSchema({ typeDefs });

  const queryDocument: DocumentNode = gql`
    query MyQuery {
      day
    }
  `;
  const queryOperationName = getOperationName(queryDocument);
  if (!queryOperationName) throw new Error("invalid query operation name");

  const request = {
    context: { client: dummyClient },
    query: queryDocument,
    variables: {},
    operationName: queryOperationName
  };

  const response = {
    data: {
      day: null
    }
  };

  it("parses null values for nullable leaf types", async () => {
    const link = ApolloLink.from([
      withScalars({ schema }),
      new ApolloLink(() => {
        return observableOf(response);
      })
    ]);

    const observable = execute(link, request, { client: dummyClient });
    const result = await nextValue(observable);
    expect(result).toEqual({ data: { day: null } });
  });
});
