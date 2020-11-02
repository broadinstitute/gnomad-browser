import React, { useEffect, useState } from 'react'

let resizeCallbacks = []

window.addEventListener('resize', () =>
  resizeCallbacks.forEach(cb => {
    const width = window.innerWidth
    cb({ width })
  })
)

export const withWindowSize = Component => {
  const WithWindowSize = props => {
    const [size, setSize] = useState({ width: window.innerWidth })

    useEffect(() => {
      resizeCallbacks.push(setSize)
      return function unsubscribe() {
        resizeCallbacks = resizeCallbacks.filter(cb => cb !== setSize)
      }
    }, [])

    return <Component {...props} width={size.width} />
  }

  const componentName = Component.displayName || Component.name || 'Component'
  WithWindowSize.displayName = `withWindowSize(${componentName}`

  return WithWindowSize
}
