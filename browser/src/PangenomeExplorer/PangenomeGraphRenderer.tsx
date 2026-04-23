import React, { useState, useCallback, useMemo } from 'react'
import { PangenomeGraph } from './pangenome-graph'
import { BinnedHeatmap, heatmapDimensions } from './layouts/binnedHeatmap'
import { AlluvialFlow, alluvialDimensions } from './layouts/alluvialFlow'

type Props = {
  graphData: PangenomeGraph
  layoutType: string
  width: number
  height: number
}

const PangenomeGraphRenderer = ({ graphData, layoutType, width, height }: Props) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Reset transform when layout changes
  const [prevLayout, setPrevLayout] = useState(layoutType)
  if (layoutType !== prevLayout) {
    setPrevLayout(layoutType)
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  const dims = useMemo(() => {
    if (layoutType === 'heatmap') {
      return heatmapDimensions(graphData, width)
    }
    return alluvialDimensions(graphData, width, height)
  }, [graphData, layoutType, width, height])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(10, Math.max(0.1, transform.scale * scaleFactor))
      setTransform((t) => ({ ...t, scale: newScale }))
    },
    [transform.scale]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    },
    [transform.x, transform.y]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return
      setTransform((t) => ({
        ...t,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }))
    },
    [dragging, dragStart]
  )

  const handleMouseUp = useCallback(() => setDragging(false), [])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${dims.totalWidth} ${dims.totalHeight}`}
      preserveAspectRatio="xMidYMin meet"
      style={{ background: '#fafafa', cursor: dragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {layoutType === 'heatmap' ? (
          <BinnedHeatmap graph={graphData} width={width} height={height} />
        ) : (
          <AlluvialFlow graph={graphData} width={width} height={height} />
        )}
      </g>
    </svg>
  )
}
export default PangenomeGraphRenderer
