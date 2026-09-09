import { useEffect } from 'react'

// How long to keep re-aligning after mount while the rest of the page renders.
const SETTLE_TIMEOUT_MS = 2000

// App.tsx can scroll before lazy or query-loaded sections exist. Pages retry here while
// layout settles: short documents can clamp scrolling, and later content can move an already
// aligned target. Stop after the bounded window or as soon as the reader takes over.
const useScrollToHash = () => {
  useEffect(() => {
    const { hash } = window.location
    if (!hash) {
      return undefined
    }

    // The id is used with getElementById rather than a selector, since an arbitrary hash from
    // the URL is not necessarily a valid selector.
    const id = hash.slice(1)
    const start = performance.now()
    let animationFrame: number | undefined
    let finished = false

    const removeInputListeners = () => {
      window.removeEventListener('wheel', finish)
      window.removeEventListener('touchstart', finish)
      window.removeEventListener('keydown', finish)
      window.removeEventListener('mousedown', finish)
    }

    function finish() {
      if (finished) {
        return
      }

      finished = true
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame)
        animationFrame = undefined
      }
      removeInputListeners()
    }

    const align = () => {
      animationFrame = undefined
      if (finished) {
        return
      }

      const target = document.getElementById(id)
      if (target && Math.abs(target.getBoundingClientRect().top) > 1) {
        target.scrollIntoView()
      }

      if (performance.now() - start < SETTLE_TIMEOUT_MS) {
        animationFrame = requestAnimationFrame(align)
      } else {
        finish()
      }
    }

    // Deliberate input only. A plain 'scroll' listener would also catch our own scrolling.
    window.addEventListener('wheel', finish, { passive: true })
    window.addEventListener('touchstart', finish, { passive: true })
    window.addEventListener('keydown', finish)
    window.addEventListener('mousedown', finish)

    animationFrame = requestAnimationFrame(align)

    return finish
  }, [])
}

export default useScrollToHash
