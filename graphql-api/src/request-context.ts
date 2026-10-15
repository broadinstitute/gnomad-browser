import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  startAt: number
  startCpu: NodeJS.CpuUsage
  startHeapUsed: number
  trace: string | null
}
export const requestStore = new AsyncLocalStorage<RequestContext>()
export const getRequestContext = () => requestStore.getStore()
