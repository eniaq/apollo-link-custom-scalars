import {
  getNullableType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLScalarType,
  GraphQLSchema,
  isEnumType,
  isListType,
  isNonNullType,
  isScalarType
} from "graphql";
import { FunctionsMap } from "../types/functions-map";
import { NullFunctions } from "../types/null-functions";
import { isNone } from "./is-none";
import { isRecord } from "./is-record";
import { mapIfArray } from "./map-if-array";

export class Serializer {
  constructor(
    readonly schema: GraphQLSchema,
    readonly functionsMap: FunctionsMap,
    readonly removeTypenameFromInputs: boolean,
    readonly nullFunctions: NullFunctions
  ) {}

  public serialize(value: unknown, type: GraphQLInputType): unknown {
    if (isNonNullType(type)) {
      return this.serializeInternal(value, getNullableType(type));
    }

    return this.serializeNullable(value, getNullableType(type));
  }

  protected serializeNullable(value: unknown, type: GraphQLInputType): unknown {
    return this.nullFunctions.serialize(this.serializeInternal(value, type));
  }

  protected serializeInternal(value: unknown, type: GraphQLInputType): unknown {
    if (isNone(value)) {
      return value;
    }

    if (isScalarType(type) || isEnumType(type)) {
      return this.serializeLeaf(value, type);
    }

    if (isListType(type)) {
      return mapIfArray(value, (v) => this.serialize(v, type.ofType));
    }

    return this.serializeInputObject(value, type);
  }

  protected serializeLeaf(value: unknown, type: GraphQLScalarType | GraphQLEnumType): unknown {
    const fns = this.functionsMap[type.name] ?? type;
    return fns.serialize(value);
  }

  protected serializeInputObject(value: unknown, type: GraphQLInputObjectType): unknown {
    if (!isRecord(value)) {
      return value;
    }

    const mutableValue: Record<string, unknown> = this.removeTypenameFromInputs
      ? { ...value }
      : value;
    if (this.removeTypenameFromInputs) {
      delete mutableValue["__typename"];
    }

    const ret: Record<string, unknown> = {};
    const fields = type.getFields();
    for (const [key, val] of Object.entries(mutableValue)) {
      const field = fields[key];
      ret[key] = field ? this.serialize(val, field.type) : val;
    }
    return ret;
  }
}
