import { useEffect, useState } from 'react'

const cancelable = promise => {
  let isCanceled = false
  const wrapper = new Promise((resolve, reject) => {
    promise.then(
      value => {
        if (!isCanceled) {
          resolve(value)
        }
      },
      error => {
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

const useRequest = makeRequest => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [response, setResponse] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const request = cancelable(makeRequest())
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
