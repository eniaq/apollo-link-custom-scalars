import { ApolloLink, Observable } from "@apollo/client";
import {
  GraphQLError,
  GraphQLLeafType,
  GraphQLSchema,
  isInputType,
  isLeafType,
  NamedTypeNode,
  TypeNode
} from "graphql";
import { GraphQLFormattedError } from "graphql/error";
import { FunctionsMap } from "../types/functions-map";
import { NullFunctions } from "../types/null-functions";
import defaultNullFunctions from "./default-null-functions";
import { mapIfArray } from "./map-if-array";
import { isListTypeNode, isNonNullTypeNode, isOperationDefinitionNode } from "./node-types";
import { Serializer } from "./serializer";
import { treatResult } from "./treat-result";
import { OperationVariables } from "@apollo/client";

type ScalarApolloLinkParams = {
  schema: GraphQLSchema;
  typesMap?: FunctionsMap;
  validateEnums?: boolean;
  removeTypenameFromInputs?: boolean;
  nullFunctions?: NullFunctions;
};

type SubscriptionLike = { unsubscribe(): void };

export class ScalarApolloLink extends ApolloLink {
  public readonly schema: GraphQLSchema;
  public readonly typesMap: FunctionsMap;
  public readonly validateEnums: boolean;
  public readonly removeTypenameFromInputs: boolean;
  public readonly functionsMap: FunctionsMap;
  public readonly serializer: Serializer;
  public readonly nullFunctions: NullFunctions;

  constructor(pars: ScalarApolloLinkParams) {
    super();
    this.schema = pars.schema;
    this.typesMap = pars.typesMap ?? {};
    this.validateEnums = pars.validateEnums ?? false;
    this.removeTypenameFromInputs = pars.removeTypenameFromInputs ?? false;
    this.nullFunctions = pars.nullFunctions ?? defaultNullFunctions;

    const leafTypesMap: Record<string, GraphQLLeafType> = {};
    for (const [key, value] of Object.entries(this.schema.getTypeMap())) {
      if (isLeafType(value)) {
        leafTypesMap[key] = value;
      }
    }
    this.functionsMap = { ...leafTypesMap, ...this.typesMap };
    this.serializer = new Serializer(
      this.schema,
      this.functionsMap,
      this.removeTypenameFromInputs,
      this.nullFunctions
    );
  }

  // ApolloLink code based on https://github.com/with-heart/apollo-link-response-resolver
  public override request(
    givenOperation: ApolloLink.Operation,
    forward: ApolloLink.ForwardFunction
  ): Observable<ApolloLink.Result> {
    const operation = this.cleanVariables(givenOperation);

    return new Observable((observer) => {
      let sub: SubscriptionLike | null = null;

      try {
        const forwardObservable = forward(operation);
        sub = forwardObservable.subscribe({
          next: (result) => {
            try {
              observer.next(this.parse(operation, result));
            } catch (treatError) {
              const errors = result.errors ? [...result.errors] : [];
              if (treatError instanceof GraphQLError) {
                errors.push(treatError as GraphQLFormattedError);
              }
              observer.next({ errors });
            }
          },
          error: observer.error.bind(observer),
          complete: observer.complete.bind(observer)
        });
      } catch (error) {
        observer.error(error);
      }

      return () => {
        sub?.unsubscribe();
      };
    });
  }

  protected parse(operation: ApolloLink.Operation, result: ApolloLink.Result): ApolloLink.Result {
    return treatResult({
      operation,
      result,
      functionsMap: this.functionsMap,
      schema: this.schema,
      validateEnums: this.validateEnums,
      nullFunctions: this.nullFunctions
    });
  }

  /**
   * mutate the operation object with the serialized variables
   */
  protected cleanVariables(operation: ApolloLink.Operation): ApolloLink.Operation {
    const operationDefinition = operation.query.definitions.find(isOperationDefinitionNode);
    const variableDefinitions = operationDefinition?.variableDefinitions ?? [];
    if (!variableDefinitions.length) return operation;

    const variables: OperationVariables = operation.variables ?? {};
    for (const variableDefinition of variableDefinitions) {
      const key = variableDefinition.variable.name.value;
      variables[key] = this.serialize(variables[key], variableDefinition.type);
    }

    operation.variables = variables;
    return operation;
  }

  protected serialize(value: unknown, typeNode: TypeNode): unknown {
    if (isNonNullTypeNode(typeNode)) {
      return this.serialize(value, typeNode.type);
    }

    if (isListTypeNode(typeNode)) {
      return mapIfArray(value, (v) => this.serialize(v, typeNode.type));
    }

    return this.serializeNamed(value, typeNode);
  }

  protected serializeNamed(value: unknown, typeNode: NamedTypeNode): unknown {
    const typeName = typeNode.name.value;
    const schemaType = this.schema.getType(typeName);

    return schemaType && isInputType(schemaType)
      ? this.serializer.serialize(value, schemaType)
      : value;
  }
}

export const withScalars = (pars: ScalarApolloLinkParams): ApolloLink => {
  return new ScalarApolloLink(pars);
};
