import elasticsearch from '@elastic/elasticsearch'

type RequestHeaders = Record<string, string>
type RequestHeadersProvider = () => Promise<RequestHeaders>

// IdTokenClient caches unexpired tokens and refreshes them near expiry. Coalescing
// concurrent calls avoids a burst of duplicate refreshes at token rollover.
export const coalesceRequestHeaders = (
  getRequestHeaders: RequestHeadersProvider
): RequestHeadersProvider => {
  let inFlight: Promise<RequestHeaders> | undefined

  return () => {
    if (!inFlight) {
      const request = Promise.resolve().then(getRequestHeaders)
      inFlight = request

      const clearInFlight = () => {
        if (inFlight === request) {
          inFlight = undefined
        }
      }
      request.then(clearInFlight, clearInFlight)
    }

    return inFlight
  }
}

const addAuthorizationHeader = (options: any, authHeaders: RequestHeaders) => {
  const authorizationEntry = Object.entries(authHeaders).find(
    ([name]) => name.toLowerCase() === 'authorization'
  )
  if (!authorizationEntry) {
    throw new Error('Cloud Run identity token client returned no authorization header')
  }

  const headers = Object.fromEntries(
    Object.entries(options?.headers || {}).filter(
      ([name]) => name.toLowerCase() !== 'authorization'
    )
  )

  return {
    ...options,
    headers: {
      ...headers,
      authorization: authorizationEntry[1],
    },
  }
}

export const createCloudRunAuthTransport = (getRequestHeaders: RequestHeadersProvider) =>
  class CloudRunAuthTransport extends elasticsearch.Transport {
    request(params: any, options?: any, callback?: any): any {
      const requestOptions = typeof options === 'function' ? undefined : options
      const requestCallback = typeof options === 'function' ? options : callback

      if (!requestCallback) {
        return new Promise((resolve, reject) => {
          getRequestHeaders().then(
            (authHeaders) => {
              super.request(
                params,
                addAuthorizationHeader(requestOptions, authHeaders),
                (error, result) => (error ? reject(error) : resolve(result))
              )
            },
            reject
          )
        })
      }

      let aborted = false
      let authenticatedRequest: any

      getRequestHeaders().then(
        (authHeaders) => {
          if (!aborted) {
            authenticatedRequest = super.request(
              params,
              addAuthorizationHeader(requestOptions, authHeaders),
              requestCallback
            )
          }
        },
        (error) => {
          if (!aborted) {
            requestCallback(error, null)
          }
        }
      )

      return {
        abort: () => {
          aborted = true
          authenticatedRequest?.abort()
        },
      }
    }
  }
