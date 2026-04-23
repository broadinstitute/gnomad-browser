import React from 'react'
import { scaleLinear } from 'd3-scale'
import { PangenomeGraph } from '../pangenome-graph'

const MARGIN = { top: 10, right: 20, bottom: 40, left: 120 }
const ROW_HEIGHT = 6
const ROW_GAP = 1
const MAX_ROWS = 80

type Props = {
  graph: PangenomeGraph
  width: number
  height: number
}

export const heatmapDimensions = (graph: PangenomeGraph, width: number) => {
  const numRows = Math.min(graph.paths.length, MAX_ROWS)
  const totalHeight = MARGIN.top + numRows * (ROW_HEIGHT + ROW_GAP) + MARGIN.bottom
  const totalWidth = MARGIN.left + width + MARGIN.right
  return { totalWidth, totalHeight }
}

export const BinnedHeatmap = ({ graph, width }: Props) => {
  const NUM_BINS = 100
  const plotWidth = width
  const binWidth = plotWidth / NUM_BINS
  const binSizeGenomic = Math.ceil((graph.stop - graph.start) / NUM_BINS)

  const paths = [...graph.paths].sort((a, b) => b.sampleCount - a.sampleCount)
  const displayPaths = paths.slice(0, MAX_ROWS)
  const truncated = paths.length > MAX_ROWS

  const xScale = scaleLinear().domain([graph.start, graph.stop]).range([0, plotWidth])
  const ticks = xScale.ticks(10)

  const totalRows = displayPaths.length
  const plotHeight = totalRows * (ROW_HEIGHT + ROW_GAP)

  const elements: React.ReactElement[] = []

  // Title
  elements.push(
    React.createElement(
      'text',
      {
        key: 'title',
        x: MARGIN.left + plotWidth / 2,
        y: MARGIN.top - 2,
        textAnchor: 'middle',
        fontSize: 11,
        fontWeight: 'bold',
        fill: '#333',
      },
      `Haplotype Groups by Genomic Position${truncated ? ` (top ${MAX_ROWS} of ${paths.length})` : ''}`
    )
  )

  // Axis line
  elements.push(
    React.createElement('line', {
      key: 'axis-line',
      x1: MARGIN.left,
      y1: MARGIN.top + plotHeight,
      x2: MARGIN.left + plotWidth,
      y2: MARGIN.top + plotHeight,
      stroke: '#333',
      strokeWidth: 1,
    })
  )

  // Axis ticks + labels
  ticks.forEach((tick, i) => {
    const x = MARGIN.left + xScale(tick)
    elements.push(
      React.createElement('line', {
        key: `tick-${i}`,
        x1: x,
        y1: MARGIN.top + plotHeight,
        x2: x,
        y2: MARGIN.top + plotHeight + 5,
        stroke: '#333',
      })
    )
    elements.push(
      React.createElement(
        'text',
        {
          key: `tick-label-${i}`,
          x,
          y: MARGIN.top + plotHeight + 18,
          textAnchor: 'middle',
          fontSize: 8,
          fill: '#555',
        },
        tick.toLocaleString()
      )
    )
  })

  // Axis label
  elements.push(
    React.createElement(
      'text',
      {
        key: 'x-label',
        x: MARGIN.left + plotWidth / 2,
        y: MARGIN.top + plotHeight + 32,
        textAnchor: 'middle',
        fontSize: 9,
        fill: '#333',
      },
      'Genomic Position'
    )
  )

  // Rows
  displayPaths.forEach((path, rowIndex) => {
    const y = MARGIN.top + rowIndex * (ROW_HEIGHT + ROW_GAP)

    // Row label (sample count)
    elements.push(
      React.createElement(
        'text',
        {
          key: `label-${rowIndex}`,
          x: MARGIN.left - 4,
          y: y + ROW_HEIGHT - 1,
          textAnchor: 'end',
          fontSize: 5,
          fill: '#666',
        },
        `${path.sampleCount}s`
      )
    )

    // Determine which bins have Alt nodes for this path
    const altPositions = new Set<number>()
    path.nodeIds.forEach((nid) => {
      const node = graph.nodes.find((n) => n.id === nid)
      if (node && node.type === 'alt') {
        altPositions.add(node.position)
      }
    })

    // Base row (ref background)
    elements.push(
      React.createElement(
        'rect',
        {
          key: `row-${rowIndex}`,
          x: MARGIN.left,
          y,
          width: plotWidth,
          height: ROW_HEIGHT,
          fill: '#dde4ea',
          rx: 1,
        },
        React.createElement('title', null, `Group ${path.hash} (${path.sampleCount} samples)`)
      )
    )

    // Alt bins
    for (let i = 0; i < NUM_BINS; i++) {
      const binStart = graph.start + i * binSizeGenomic
      const binEnd = binStart + binSizeGenomic
      let altCount = 0
      for (const pos of altPositions) {
        if (pos >= binStart && pos <= binEnd) {
          altCount++
        }
      }
      if (altCount > 0) {
        // Intensity based on how many alts in this bin
        const intensity = Math.min(1, altCount / 3)
        const r = Math.round(215 * intensity + 221 * (1 - intensity))
        const g = Math.round(48 * intensity + 228 * (1 - intensity))
        const b = Math.round(39 * intensity + 234 * (1 - intensity))
        elements.push(
          React.createElement(
            'rect',
            {
              key: `alt-${rowIndex}-${i}`,
              x: MARGIN.left + i * binWidth,
              y,
              width: binWidth,
              height: ROW_HEIGHT,
              fill: `rgb(${r},${g},${b})`,
              rx: 1,
            },
            React.createElement('title', null, `${altCount} variant(s) in bin`)
          )
        )
      }
    }
  })

  // Legend
  const legendY = MARGIN.top + plotHeight + 22
  const legendItems = [
    { label: 'Reference', color: '#dde4ea' },
    { label: '1 variant', color: 'rgb(218,138,137)' },
    { label: '2+ variants', color: 'rgb(216,93,88)' },
    { label: '3+ variants', color: '#d73027' },
  ]
  legendItems.forEach((item, i) => {
    const lx = MARGIN.left + i * 100
    elements.push(
      React.createElement('rect', {
        key: `legend-rect-${i}`,
        x: lx,
        y: legendY,
        width: 10,
        height: 8,
        fill: item.color,
        rx: 1,
      })
    )
    elements.push(
      React.createElement(
        'text',
        {
          key: `legend-text-${i}`,
          x: lx + 13,
          y: legendY + 7,
          fontSize: 7,
          fill: '#555',
        },
        item.label
      )
    )
  })

  return React.createElement('g', null, ...elements)
}
