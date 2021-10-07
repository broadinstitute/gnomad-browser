import { useEffect, useState } from 'react'

let resizeCallbacks = []

window.addEventListener('resize', () =>
  resizeCallbacks.forEach(cb => {
    const width = window.innerWidth
    cb({ width })
  })
)

export const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth })

  useEffect(() => {
    resizeCallbacks.push(setSize)
    return function unsubscribe() {
      resizeCallbacks = resizeCallbacks.filter(cb => cb !== setSize)
    }
  }, [])

  return size
}
