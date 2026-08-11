import { useEffect } from 'react'

// How long to keep re-aligning after mount while the rest of the page renders.
const SETTLE_TIMEOUT_MS = 2000

// The app scrolls to the URL's hash when a page's code finishes loading (see App.tsx). Pages
// whose content renders only after a query resolves are still showing a loading message at that
// point, so their sections are not yet in the document and that scroll finds nothing. Such pages
// call this hook from the component that renders once their data is available.
//
// A single scroll on mount is not enough: the sections below the target have not rendered yet,
// so the document is often too short for the browser to bring the target all the way to the top
// and the scroll is clamped to the bottom of the page. Keep re-aligning while the page grows,
// stopping early if the reader takes over.
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
    let animationFrame = 0
    let readerTookOver = false

    const stopAligning = () => {
      readerTookOver = true
    }

    const align = () => {
      if (readerTookOver) {
        return
      }

      const target = document.getElementById(id)
      if (target && Math.abs(target.getBoundingClientRect().top) > 1) {
        target.scrollIntoView()
      }

      if (performance.now() - start < SETTLE_TIMEOUT_MS) {
        animationFrame = requestAnimationFrame(align)
      }
    }

    // Deliberate input only. A plain 'scroll' listener would also catch our own scrolling.
    window.addEventListener('wheel', stopAligning, { passive: true })
    window.addEventListener('touchstart', stopAligning, { passive: true })
    window.addEventListener('keydown', stopAligning)
    window.addEventListener('mousedown', stopAligning)

    animationFrame = requestAnimationFrame(align)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('wheel', stopAligning)
      window.removeEventListener('touchstart', stopAligning)
      window.removeEventListener('keydown', stopAligning)
      window.removeEventListener('mousedown', stopAligning)
    }
  }, [])
}

export default useScrollToHash
