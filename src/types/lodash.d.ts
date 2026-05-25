declare module 'lodash.set' {
  function set(object: object, path: string | string[], value: unknown): object;
  export = set;
}

declare module 'lodash.clonedeep' {
  function cloneDeep<T>(value: T): T;
  export = cloneDeep;
}
