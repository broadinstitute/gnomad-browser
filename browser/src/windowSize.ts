import { useEffect, useState } from 'react'

let resizeCallbacks: any = []

window.addEventListener('resize', () =>
  // @ts-expect-error TS(7006) FIXME: Parameter 'cb' implicitly has an 'any' type.
  resizeCallbacks.forEach((cb) => {
    const width = window.innerWidth
    cb({ width })
  })
)

export const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth })

  useEffect(() => {
    resizeCallbacks.push(setSize)
    return function unsubscribe() {
      // @ts-expect-error TS(7006) FIXME: Parameter 'cb' implicitly has an 'any' type.
      resizeCallbacks = resizeCallbacks.filter((cb) => cb !== setSize)
    }
  }, [])

  return size
}
