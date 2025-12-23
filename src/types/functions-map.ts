import { GraphQLLeafType, GraphQLScalarSerializer, GraphQLScalarValueParser } from "graphql";

export type ParsingFunctionsObject<TParsed = unknown, TRaw = unknown> = {
  serialize: GraphQLScalarSerializer<TRaw>;
  parseValue: GraphQLScalarValueParser<TParsed>;
};

export type FunctionsMap = Record<string, GraphQLLeafType | ParsingFunctionsObject>;
