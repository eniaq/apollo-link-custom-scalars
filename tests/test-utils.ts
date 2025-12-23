import { ApolloClient, Observable } from "@apollo/client";
import { DocumentNode, getOperationAST } from "graphql";

export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

export const isString = (value: unknown): value is string => typeof value === "string";

const cloneInternal = <T>(value: T): T => {
  if (value instanceof Date) {
    return new Date(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneInternal(item)) as T;
  }

  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value as object) as object | null;
    const result = Object.create(proto) as Record<string, unknown>;
    const descriptors = Object.getOwnPropertyDescriptors(value as object);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if ("value" in descriptor) {
        descriptor.value = cloneInternal(descriptor.value);
      }
      Object.defineProperty(result, key, descriptor);
    }
    return result as T;
  }

  return value;
};

export const cloneDeep = <T>(value: T): T => cloneInternal(value);

export const observableOf = <T>(value: T): Observable<T> =>
  new Observable((observer) => {
    observer.next(value);
    observer.complete();
  });

export const dummyClient = {} as ApolloClient;

export const getOperationName = (document: DocumentNode): string | null => {
  const operation = getOperationAST(document, undefined);
  return operation?.name?.value ?? null;
};

export const nextValue = <T>(observable: Observable<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    let sub: { unsubscribe(): void } | null = null;
    sub = observable.subscribe({
      next: (value) => {
        resolve(value);
        sub?.unsubscribe();
      },
      error: reject
    });
  });
