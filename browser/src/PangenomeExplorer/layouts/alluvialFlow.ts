import React from 'react'
import { scaleLinear } from 'd3-scale'
import { PangenomeGraph, GraphNode } from '../pangenome-graph'

const COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
]

const MARGIN = { top: 30, right: 20, bottom: 60, left: 20 }
const MAX_PATHS = 30

type Props = {
  graph: PangenomeGraph
  width: number
  height: number
}

// Smooth cubic bezier between points
const buildPathD = (coords: { x: number; y: number }[]): string => {
  if (coords.length === 0) return ''
  if (coords.length === 1) return `M${coords[0].x},${coords[0].y}`

  let d = `M${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

export const alluvialDimensions = (_graph: PangenomeGraph, width: number, height: number) => {
  const totalWidth = MARGIN.left + width + MARGIN.right
  const totalHeight = MARGIN.top + height + MARGIN.bottom
  return { totalWidth, totalHeight }
}

export const AlluvialFlow = ({ graph, width, height }: Props) => {
  const variantNodes = graph.nodes.filter((n) => n.isVariantSite)
  const uniquePositions = Array.from(new Set(variantNodes.map((n) => n.position))).sort(
    (a, b) => a - b
  )

  if (uniquePositions.length === 0) return null

  // Show top N paths by sample count
  const sortedPaths = [...graph.paths].sort((a, b) => b.sampleCount - a.sampleCount)
  const displayPaths = sortedPaths.slice(0, MAX_PATHS)
  const truncated = graph.paths.length > MAX_PATHS

  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom

  // X: evenly space variant positions across the plot
  const xScale = scaleLinear()
    .domain([0, uniquePositions.length - 1])
    .range([MARGIN.left + 40, MARGIN.left + plotWidth - 20])

  const posToX = (pos: number) => {
    const idx = uniquePositions.indexOf(pos)
    return xScale(idx)
  }

  // Genomic position scale for axis
  const genomicXScale = scaleLinear()
    .domain([graph.start, graph.stop])
    .range([MARGIN.left + 40, MARGIN.left + plotWidth - 20])

  // Total displayed samples for thickness scaling
  const totalDisplayedSamples = displayPaths.reduce((s, p) => s + p.sampleCount, 0)
  const thicknessScale = scaleLinear()
    .domain([0, totalDisplayedSamples])
    .range([0, plotHeight * 0.8])

  // ---- Node layout: at each column, stack allele groups vertically ----
  // For each variant position, group the displayed paths by which node they use.
  // Paths sharing the same node (ref or specific alt) are stacked together.
  // The y-position of each node is the center of its stacked block.

  // nodeId -> cumulative sample count for y sizing
  // We also track per-path offsets within each node's block

  // pathCoords[pathIdx] = array of {x, y} for each variant column
  const pathCoords: { x: number; y: number }[][] = displayPaths.map(() => [])

  // For each path, precompute which node it uses at each position
  const pathNodeAtPos: (GraphNode | null)[][] = displayPaths.map((path) => {
    const varMap = new Map<number, string>()
    path.nodeIds.forEach((nid) => {
      const node = graph.nodes.find((n) => n.id === nid)
      if (node && node.isVariantSite) {
        varMap.set(node.position, nid)
      }
    })

    return uniquePositions.map((pos) => {
      const nid = varMap.get(pos)
      if (nid) return graph.nodes.find((n) => n.id === nid) || null
      // Path doesn't have a variant here → uses ref
      return graph.nodes.find((n) => n.id === `var-ref-${pos}`) || null
    })
  })

  const NODE_GAP = 8 // vertical gap between allele groups at a column

  uniquePositions.forEach((pos, colIdx) => {
    const x = posToX(pos)

    // Group paths by the node they use at this position
    const groups = new Map<string, { nodeId: string; isAlt: boolean; pathIndices: number[] }>()
    displayPaths.forEach((_, pathIdx) => {
      const node = pathNodeAtPos[pathIdx][colIdx]
      const nodeId = node?.id || `var-ref-${pos}`
      const isAlt = node?.type === 'alt'
      if (!groups.has(nodeId)) {
        groups.set(nodeId, { nodeId, isAlt: isAlt || false, pathIndices: [] })
      }
      groups.get(nodeId)!.pathIndices.push(pathIdx)
    })

    // Sort groups: ref first, then alts
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (!a.isAlt && b.isAlt) return -1
      if (a.isAlt && !b.isAlt) return 1
      return 0
    })

    // Compute total stacked height
    const groupHeights = sortedGroups.map((g) => {
      const samples = g.pathIndices.reduce((s, pi) => s + displayPaths[pi].sampleCount, 0)
      return thicknessScale(samples)
    })
    const totalStackHeight =
      groupHeights.reduce((s, h) => s + h, 0) + (sortedGroups.length - 1) * NODE_GAP

    // Center the stack in the plot area
    let currentY = MARGIN.top + (plotHeight - totalStackHeight) / 2

    sortedGroups.forEach((group, gi) => {
      const groupH = groupHeights[gi]

      // Within this group, stack paths by sample count
      let innerY = currentY
      group.pathIndices.forEach((pathIdx) => {
        const pathH = thicknessScale(displayPaths[pathIdx].sampleCount)
        const centerY = innerY + pathH / 2
        pathCoords[pathIdx].push({ x, y: centerY })
        innerY += pathH
      })

      currentY += groupH + NODE_GAP
    })
  })

  const elements: React.ReactElement[] = []

  // Title
  elements.push(
    React.createElement(
      'text',
      {
        key: 'title',
        x: MARGIN.left + plotWidth / 2,
        y: MARGIN.top - 10,
        textAnchor: 'middle',
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#333',
      },
      `Haplotype Paths through Variant Sites${truncated ? ` (top ${MAX_PATHS} of ${graph.paths.length} groups)` : ''}`
    )
  )

  // Genomic position axis at bottom
  const axisY = MARGIN.top + plotHeight + 10
  elements.push(
    React.createElement('line', {
      key: 'axis-line',
      x1: MARGIN.left + 40,
      y1: axisY,
      x2: MARGIN.left + plotWidth - 20,
      y2: axisY,
      stroke: '#999',
      strokeWidth: 1,
    })
  )

  const genomicTicks = genomicXScale.ticks(12)
  genomicTicks.forEach((tick, i) => {
    const x = genomicXScale(tick)
    elements.push(
      React.createElement('line', {
        key: `gtick-${i}`,
        x1: x,
        y1: axisY,
        x2: x,
        y2: axisY + 5,
        stroke: '#999',
      })
    )
    elements.push(
      React.createElement(
        'text',
        {
          key: `gtick-label-${i}`,
          x,
          y: axisY + 16,
          textAnchor: 'middle',
          fontSize: 8,
          fill: '#666',
        },
        tick.toLocaleString()
      )
    )
  })

  elements.push(
    React.createElement(
      'text',
      {
        key: 'x-axis-label',
        x: MARGIN.left + plotWidth / 2,
        y: axisY + 30,
        textAnchor: 'middle',
        fontSize: 9,
        fill: '#333',
      },
      'Genomic Position'
    )
  )

  // Vertical gridlines at variant positions (light)
  uniquePositions.forEach((pos, i) => {
    const x = posToX(pos)
    elements.push(
      React.createElement('line', {
        key: `vgrid-${i}`,
        x1: x,
        y1: MARGIN.top,
        x2: x,
        y2: MARGIN.top + plotHeight,
        stroke: '#f0f0f0',
        strokeWidth: 0.5,
      })
    )
  })

  // Draw path ribbons — paths now converge/diverge at shared nodes
  displayPaths.forEach((path, pathIdx) => {
    const coords = pathCoords[pathIdx]
    if (coords.length === 0) return

    const color = COLORS[pathIdx % COLORS.length]
    const strokeWidth = Math.max(1, thicknessScale(path.sampleCount))

    elements.push(
      React.createElement(
        'path',
        {
          key: `ribbon-${pathIdx}`,
          d: buildPathD(coords),
          fill: 'none',
          stroke: color,
          strokeWidth,
          strokeOpacity: 0.55,
          strokeLinecap: 'round',
        },
        React.createElement(
          'title',
          null,
          `Group ${path.hash} | ${path.sampleCount} sample${path.sampleCount > 1 ? 's' : ''}`
        )
      )
    )
  })

  // Draw allele node markers at each column
  uniquePositions.forEach((pos, colIdx) => {
    const x = posToX(pos)

    // Collect unique y-positions and node types at this column
    const seen = new Map<string, { y: number; isAlt: boolean; node: GraphNode | null }>()
    displayPaths.forEach((_, pathIdx) => {
      const node = pathNodeAtPos[pathIdx][colIdx]
      const nodeId = node?.id || `var-ref-${pos}`
      if (!seen.has(nodeId)) {
        seen.set(nodeId, {
          y: pathCoords[pathIdx][colIdx].y,
          isAlt: node?.type === 'alt' || false,
          node,
        })
      }
    })

    Array.from(seen.entries()).forEach(([nodeId, { y, isAlt, node }]) => {
      elements.push(
        React.createElement(
          'circle',
          {
            key: `node-${colIdx}-${nodeId}`,
            cx: x,
            cy: y,
            r: isAlt ? 4 : 3,
            fill: isAlt ? '#d73027' : '#4a90d9',
            stroke: '#fff',
            strokeWidth: 1,
          },
          React.createElement(
            'title',
            null,
            isAlt
              ? `ALT: ${node?.alleles.join(' > ')} at ${pos.toLocaleString()}`
              : `REF at ${pos.toLocaleString()}`
          )
        )
      )
    })
  })

  // Legend
  const legendX = MARGIN.left + plotWidth - 220
  const legendY = axisY + 20
  elements.push(
    React.createElement('rect', {
      key: 'legend-bg',
      x: legendX - 5,
      y: legendY - 10,
      width: 230,
      height: 42,
      fill: 'white',
      stroke: '#ddd',
      rx: 3,
    })
  )
  elements.push(
    React.createElement('line', {
      key: 'legend-ref-line',
      x1: legendX,
      y1: legendY,
      x2: legendX + 20,
      y2: legendY,
      stroke: '#1f77b4',
      strokeWidth: 3,
      strokeOpacity: 0.55,
    })
  )
  elements.push(
    React.createElement(
      'text',
      { key: 'legend-ref-text', x: legendX + 24, y: legendY + 3, fontSize: 8, fill: '#333' },
      'Path (thickness = sample count)'
    )
  )
  elements.push(
    React.createElement('circle', {
      key: 'legend-ref-dot',
      cx: legendX + 10,
      cy: legendY + 13,
      r: 3,
      fill: '#4a90d9',
      stroke: '#fff',
      strokeWidth: 1,
    })
  )
  elements.push(
    React.createElement(
      'text',
      { key: 'legend-refn-text', x: legendX + 24, y: legendY + 16, fontSize: 8, fill: '#333' },
      'Ref node (paths converge here)'
    )
  )
  elements.push(
    React.createElement('circle', {
      key: 'legend-alt-dot',
      cx: legendX + 10,
      cy: legendY + 25,
      r: 4,
      fill: '#d73027',
      stroke: '#fff',
      strokeWidth: 1,
    })
  )
  elements.push(
    React.createElement(
      'text',
      { key: 'legend-alt-text', x: legendX + 24, y: legendY + 28, fontSize: 8, fill: '#333' },
      'Alt node (paths diverge here)'
    )
  )

  return React.createElement('g', null, ...elements)
}
