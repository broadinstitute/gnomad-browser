import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  startAt: number
}
export const requestStore = new AsyncLocalStorage<RequestContext>()
export const getRequestContext = () => requestStore.getStore()
