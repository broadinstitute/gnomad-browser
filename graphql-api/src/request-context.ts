import { AsyncLocalStorage } from 'async_hooks'
import { performance } from 'perf_hooks'

export type RequestCancellationReason = 'client-disconnected' | 'deadline-exceeded'

export class RequestCanceledError extends Error {
  reason: RequestCancellationReason

  constructor(reason: RequestCancellationReason) {
    super(`Request canceled: ${reason}`)
    this.name = 'RequestCanceledError'
    this.reason = reason
  }
}

export interface RequestContext {
  requestId: string
  startAt: number
  startCpu: NodeJS.CpuUsage
  startHeapUsed: number
  trace: string | null
  abortController: AbortController
  cancellationReason: RequestCancellationReason | null
  canceledAt: number | null
}

export const requestStore = new AsyncLocalStorage<RequestContext>()
export const getRequestContext = () => requestStore.getStore()
export const getRequestAbortSignal = (): AbortSignal | undefined =>
  getRequestContext()?.abortController.signal

export const throwIfRequestCanceled = (): void => {
  const signal = getRequestAbortSignal()
  if (signal?.aborted) {
    throw signal.reason
  }
}

export const cancelRequest = (reason: RequestCancellationReason): boolean => {
  const context = getRequestContext()
  if (!context || context.cancellationReason) {
    return false
  }

  context.cancellationReason = reason
  context.canceledAt = performance.now()
  context.abortController.abort(new RequestCanceledError(reason))
  return true
}
