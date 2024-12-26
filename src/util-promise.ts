export interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export function Promise$withResolvers<T>(): PromiseWithResolvers<T> {
  const resolvers = {} as PromiseWithResolvers<T>

  resolvers.promise = new Promise((resolve_, reject_) => {
    resolvers.resolve = resolve_
    resolvers.reject = reject_
  })

  return resolvers
}
