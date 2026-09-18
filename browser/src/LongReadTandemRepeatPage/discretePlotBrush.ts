import React, { useEffect, useRef, useState } from 'react'

export type DiscreteBrushMark<T> = {
  id: string
  x: number
  y: number
  value: T
}

export type DiscreteBrushAxis = 'x' | 'xy'

export type DiscreteBrushSelection<T> = {
  markIds: string[]
  marks: T[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export const discreteBrushSelection = <T>(
  marks: DiscreteBrushMark<T>[],
  startId: string,
  endId: string,
  axis: DiscreteBrushAxis
): DiscreteBrushSelection<T> | null => {
  const start = marks.find((mark) => mark.id === startId)
  const end = marks.find((mark) => mark.id === endId)
  if (!start || !end) return null
  const xMin = Math.min(start.x, end.x)
  const xMax = Math.max(start.x, end.x)
  const yMin = axis === 'x' ? Number.NEGATIVE_INFINITY : Math.min(start.y, end.y)
  const yMax = axis === 'x' ? Number.POSITIVE_INFINITY : Math.max(start.y, end.y)
  const selected = marks.filter(
    (mark) => mark.x >= xMin && mark.x <= xMax && mark.y >= yMin && mark.y <= yMax
  )
  return {
    markIds: selected.map((mark) => mark.id),
    marks: selected.map((mark) => mark.value),
    xMin,
    xMax,
    yMin,
    yMax,
  }
}

const closestDirectionalMark = <T>(
  marks: DiscreteBrushMark<T>[],
  from: DiscreteBrushMark<T>,
  key: string,
  axis: DiscreteBrushAxis
) => {
  const candidates = marks.filter((mark) => {
    if (key === 'ArrowLeft') return mark.x < from.x
    if (key === 'ArrowRight') return mark.x > from.x
    if (axis === 'x') return false
    if (key === 'ArrowUp') return mark.y > from.y
    if (key === 'ArrowDown') return mark.y < from.y
    return false
  })
  return candidates.sort((left, right) => {
    const leftPrimary =
      key === 'ArrowLeft' || key === 'ArrowRight'
        ? Math.abs(left.x - from.x)
        : Math.abs(left.y - from.y)
    const rightPrimary =
      key === 'ArrowLeft' || key === 'ArrowRight'
        ? Math.abs(right.x - from.x)
        : Math.abs(right.y - from.y)
    const leftSecondary =
      key === 'ArrowLeft' || key === 'ArrowRight'
        ? Math.abs(left.y - from.y)
        : Math.abs(left.x - from.x)
    const rightSecondary =
      key === 'ArrowLeft' || key === 'ArrowRight'
        ? Math.abs(right.y - from.y)
        : Math.abs(right.x - from.x)
    return leftPrimary - rightPrimary || leftSecondary - rightSecondary
  })[0]
}

export const useDiscretePlotBrush = <T>({
  marks,
  axis,
  onSelect,
  onClear,
  dragThreshold = 6,
}: {
  marks: DiscreteBrushMark<T>[]
  axis: DiscreteBrushAxis
  onSelect: (selection: DiscreteBrushSelection<T>) => void
  onClear: () => void
  dragThreshold?: number
}) => {
  const anchorId = useRef<string | null>(null)
  const endpointId = useRef<string | null>(null)
  const pointer = useRef<{
    id: number
    startId: string
    endId: string
    clientX: number
    clientY: number
    dragged: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const [previewMarkIds, setPreviewMarkIds] = useState<string[]>([])
  const markIdentityKey = marks.map((mark) => mark.id).join('\u0000')
  useEffect(() => {
    if (anchorId.current && !marks.some((mark) => mark.id === anchorId.current)) {
      anchorId.current = null
      endpointId.current = null
    }
    if (endpointId.current && !marks.some((mark) => mark.id === endpointId.current)) {
      endpointId.current = null
    }
  }, [markIdentityKey, marks])

  const selectionBetween = (startId: string, endId: string) =>
    discreteBrushSelection(marks, startId, endId, axis)

  const markIdAtPointer = (event: React.PointerEvent<HTMLElement | SVGElement>) => {
    const direct = (event.target as Element | null)?.closest?.('[data-discrete-brush-id]')
    const directId = direct?.getAttribute('data-discrete-brush-id')
    if (directId && direct !== event.currentTarget) return directId

    // Pointer capture retargets move/up events to the plot container. Dense scatter and
    // heatmap targets can also overlap, so choose the geometrically nearest mark rather
    // than whichever overlapping element happens to be painted on top.
    let nearestId: string | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    event.currentTarget.querySelectorAll('[data-discrete-brush-id]').forEach((candidate) => {
      const bounds = candidate.getBoundingClientRect()
      const distance = Math.hypot(
        event.clientX - (bounds.left + bounds.width / 2),
        event.clientY - (bounds.top + bounds.height / 2)
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestId = candidate.getAttribute('data-discrete-brush-id')
      }
    })
    return nearestId
  }

  const updatePreview = (startId: string, endId: string) => {
    const selection = selectionBetween(startId, endId)
    if (selection) setPreviewMarkIds(selection.markIds)
    return selection
  }

  const containerProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement | SVGElement>) => {
      if (event.button !== 0) return
      const startId = markIdAtPointer(event)
      if (!startId) return
      pointer.current = {
        id: event.pointerId,
        startId,
        endId: startId,
        clientX: event.clientX,
        clientY: event.clientY,
        dragged: false,
      }
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement | SVGElement>) => {
      const current = pointer.current
      if (!current || current.id !== event.pointerId) return
      const distance = Math.hypot(event.clientX - current.clientX, event.clientY - current.clientY)
      if (!current.dragged && distance < dragThreshold) return
      if (!current.dragged) {
        current.dragged = true
        ;(
          event.currentTarget as Element & { setPointerCapture?: (id: number) => void }
        ).setPointerCapture?.(event.pointerId)
      }
      const endId = markIdAtPointer(event)
      if (endId) current.endId = endId
      updatePreview(current.startId, current.endId)
      event.preventDefault()
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement | SVGElement>) => {
      const current = pointer.current
      if (!current || current.id !== event.pointerId) return
      const endId = markIdAtPointer(event)
      if (endId) current.endId = endId
      if (current.dragged) {
        const selection = selectionBetween(current.startId, current.endId)
        if (selection) onSelect(selection)
        anchorId.current = current.startId
        endpointId.current = current.endId
        suppressClick.current = true
        window.setTimeout(() => {
          suppressClick.current = false
        }, 0)
      } else {
        anchorId.current = current.startId
        endpointId.current = current.startId
      }
      pointer.current = null
      setPreviewMarkIds([])
    },
    onPointerCancel: () => {
      pointer.current = null
      setPreviewMarkIds([])
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement | SVGElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setPreviewMarkIds([])
        anchorId.current = null
        endpointId.current = null
        onClear()
      }
    },
  }

  const markProps = (mark: DiscreteBrushMark<T>) => ({
    'data-discrete-brush-id': mark.id,
    onClick: (event: React.MouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false
        event.preventDefault()
        return true
      }
      if (event.shiftKey && anchorId.current) {
        const selection = selectionBetween(anchorId.current, mark.id)
        if (selection) onSelect(selection)
        endpointId.current = mark.id
        event.preventDefault()
        return true
      }
      anchorId.current = mark.id
      endpointId.current = mark.id
      return false
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        anchorId.current = null
        endpointId.current = null
        onClear()
        return true
      }
      if (event.shiftKey && event.key.startsWith('Arrow')) {
        const anchor = marks.find((candidate) => candidate.id === (anchorId.current || mark.id))
        const endpoint =
          marks.find((candidate) => candidate.id === (endpointId.current || mark.id)) || mark
        const next = anchor && closestDirectionalMark(marks, endpoint, event.key, axis)
        if (anchor && next) {
          const selection = selectionBetween(anchor.id, next.id)
          if (selection) onSelect(selection)
          anchorId.current = anchor.id
          endpointId.current = next.id
          event.preventDefault()
          return true
        }
      }
      return false
    },
  })

  return {
    containerProps,
    markProps,
    previewMarkIds: new Set(previewMarkIds),
  }
}
