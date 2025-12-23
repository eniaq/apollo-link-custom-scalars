import {
  GraphQLObjectType,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode
} from "graphql";
import { FunctionsMap } from "../types/functions-map";
import { NullFunctions } from "../types/null-functions";
import { fragmentReducer } from "./fragment-reducer";
import { isFieldNode } from "./node-types";
import { Parser } from "./parser";
import { ApolloLink } from "@apollo/client";

function rootTypeFor(
  operationDefinitionNode: OperationDefinitionNode,
  schema: GraphQLSchema
): GraphQLObjectType | null {
  if (operationDefinitionNode.operation === OperationTypeNode.QUERY) {
    return schema.getQueryType() ?? null;
  }

  if (operationDefinitionNode.operation === OperationTypeNode.MUTATION) {
    return schema.getMutationType() ?? null;
  }

  if (operationDefinitionNode.operation === OperationTypeNode.SUBSCRIPTION) {
    return schema.getSubscriptionType() ?? null;
  }

  return null;
}

type TreatResultParams = {
  schema: GraphQLSchema;
  functionsMap: FunctionsMap;
  operation: ApolloLink.Operation;
  result: ApolloLink.Result;
  validateEnums: boolean;
  nullFunctions: NullFunctions;
};

export function treatResult({
  schema,
  functionsMap,
  operation,
  result,
  validateEnums,
  nullFunctions
}: TreatResultParams): ApolloLink.Result {
  const data = result.data;
  if (!data) return result;

  const operationDefinitionNode = fragmentReducer(operation.query);
  if (!operationDefinitionNode) return result;

  const rootType = rootTypeFor(operationDefinitionNode, schema);
  if (!rootType) return result;

  const parser = new Parser(schema, functionsMap, validateEnums, nullFunctions);
  const rootSelections = operationDefinitionNode.selectionSet.selections.filter(isFieldNode);
  const newData = parser.parseObjectWithSelections(data, rootType, rootSelections);
  return { ...result, data: newData };
}
