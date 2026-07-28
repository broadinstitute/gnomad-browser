import { useState } from 'react'

export const getElementScrollbarGutter = (element: Pick<HTMLElement, 'offsetWidth' | 'clientWidth'>) =>
  Math.max(0, element.offsetWidth - element.clientWidth)

export const measureStableScrollbarGutter = () => {
  if (typeof document === 'undefined') return 0

  const probe = document.createElement('div')
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    width: '100px',
    height: '100px',
    overflowY: 'scroll',
    scrollbarGutter: 'stable',
  })
  document.body.appendChild(probe)
  const width = getElementScrollbarGutter(probe)
  probe.remove()
  return width
}

/** Width reserved by the same stable native scrollbar gutter used by haplotype tracks. */
export const useStableScrollbarGutter = () => useState(measureStableScrollbarGutter)[0]
