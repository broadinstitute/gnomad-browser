import { AsyncLocalStorage } from 'async_hooks'

// Per-request accumulator for Elasticsearch timing. The GraphQL context and the
// ES client are shared singletons, so per-request attribution can't ride on the
// context object. Instead we use AsyncLocalStorage: an Express middleware runs
// each request inside `run(accumulator, ...)`, and the ES client wrapper reads
// the current accumulator to add its elapsed time. This keeps resolvers
// untouched.
export type EsTimingAccumulator = {
  esMs: number
  esCalls: number
}

export const esTimingStore = new AsyncLocalStorage<EsTimingAccumulator>()

// Read the accumulator for the currently executing request, if any.
export const currentEsTiming = (): EsTimingAccumulator | undefined => esTimingStore.getStore()
