import { useEffect, useState } from 'react'

const cancelable = (promise: any) => {
  let isCanceled = false
  const wrapper = new Promise((resolve: any, reject: any) => {
    promise.then(
      (value: any) => {
        if (!isCanceled) {
          resolve(value)
        }
      },
      (error: any) => {
        if (!isCanceled) {
          reject(error)
        }
      }
    )
  })

  return {
    cancel: () => {
      isCanceled = true
    },
    promise: wrapper,
  }
}

const useRequest = (makeRequest: any) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [response, setResponse] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const request = cancelable(makeRequest())
    // @ts-expect-error TS(2345) FIXME: Argument of type 'Dispatch<SetStateAction<null>>' ... Remove this comment to see the full error message
    request.promise.then(setResponse, setError).finally(() => {
      setIsLoading(false)
    })
    return () => {
      request.cancel()
    }
  }, [makeRequest])

  return { isLoading, error, response }
}

export default useRequest
