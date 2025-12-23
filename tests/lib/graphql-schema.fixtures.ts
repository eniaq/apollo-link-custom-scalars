import { buildClientSchema, type IntrospectionQuery } from "graphql";
import introspectionSchemaResult from "./introspection.json";

export const graphqlSchemaObj = buildClientSchema(
  introspectionSchemaResult as unknown as IntrospectionQuery
);
