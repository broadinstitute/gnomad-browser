import React, { useMemo } from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import { PangenomeGraph } from './pangenome-graph'

const ROW_HEIGHT = 12
const ROW_GAP = 2
const MAX_ROWS = 80
const NUM_BINS = 100
const LEFT_PANEL_OFFSET = 10

type Props = {
  graph: PangenomeGraph
}

const HeatmapTrack = ({ graph }: Props) => {
  const paths = useMemo(
    () => [...graph.paths].sort((a, b) => b.sampleCount - a.sampleCount),
    [graph.paths]
  )
  const displayPaths = paths.slice(0, MAX_ROWS)

  const totalRows = displayPaths.length
  const plotHeight = Math.max(60, LEFT_PANEL_OFFSET + totalRows * (ROW_HEIGHT + ROW_GAP))
  const binSizeGenomic = Math.ceil((graph.stop - graph.start) / NUM_BINS)

  const maxSamples = displayPaths.reduce((max, p) => Math.max(max, p.sampleCount), 0)
  const maxVariants = displayPaths.reduce(
    (max, p) => Math.max(max, p.rawGroup.variants.variants.length),
    0
  )

  const sampleColorScale = scaleLinear<string>()
    .domain([0, maxSamples || 1])
    .range(['#fee0b6', '#b35806'])

  const variantColorScale = scaleLinear<string>()
    .domain([0, maxVariants || 1])
    .range(['#efefef', '#7f7f7f'])

  return (
    <Track
      renderLeftPanel={() => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%' }}>
          <svg width={200} height={plotHeight}>
            {displayPaths.map((path, rowIndex) => {
              const y = LEFT_PANEL_OFFSET + rowIndex * (ROW_HEIGHT + ROW_GAP)
              const cy = y + ROW_HEIGHT / 2
              const group = path.rawGroup
              const variantCount = group.variants.variants.length
              return (
                <TooltipAnchor
                  key={`label-${rowIndex}`}
                  tooltipComponent={() => (
                    <dl style={{ margin: 0 }}>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Start:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.start}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Stop:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.stop}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Samples:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{path.sampleCount}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Size:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.stop - group.start} bp</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Variants:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{variantCount}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Sample IDs:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.samples.map(s => s.sample_id).join(', ')}</dd></div>
                    </dl>
                  )}
                >
                  <g>
                    <circle cx={5} cy={cy} r={4} fill={sampleColorScale(path.sampleCount)} />
                    <text x={14} y={cy + 3} fontSize='9'>{path.sampleCount}</text>
                    <circle cx={45} cy={cy} r={4} fill={variantColorScale(variantCount)} />
                    <text x={54} y={cy + 3} fontSize='9'>{variantCount}</text>
                  </g>
                </TooltipAnchor>
              )
            })}
          </svg>
        </div>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
        if (displayPaths.length === 0) {
          return (
            <svg width={width} height={60}>
              <text x={width / 2} y={30} textAnchor='middle' fill='#666' fontSize='12'>
                No haplotype groups
              </text>
            </svg>
          )
        }

        return (
          <svg width={width} height={plotHeight}>
            {displayPaths.map((path, rowIndex) => {
              const y = LEFT_PANEL_OFFSET + rowIndex * (ROW_HEIGHT + ROW_GAP)

              // Find alt positions for this path
              const altPositions = new Set<number>()
              path.nodeIds.forEach((nid) => {
                const node = graph.nodes.find((n) => n.id === nid)
                if (node && node.type === 'alt') {
                  altPositions.add(node.position)
                }
              })

              const elements: React.ReactElement[] = []

              // Base row (ref background) using scalePosition
              const x1 = scalePosition(graph.start)
              const x2 = scalePosition(graph.stop)
              elements.push(
                <rect
                  key={`row-${rowIndex}`}
                  x={x1} y={y}
                  width={x2 - x1} height={ROW_HEIGHT}
                  fill='#dde4ea' rx={1}
                >
                  <title>{`Group ${path.hash} (${path.sampleCount} samples, ${path.rawGroup.variants.variants.length} variants)`}</title>
                </rect>
              )

              // Alt bins using scalePosition for x coordinates
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
                  const intensity = Math.min(1, altCount / 3)
                  const r = Math.round(215 * intensity + 221 * (1 - intensity))
                  const g = Math.round(48 * intensity + 228 * (1 - intensity))
                  const b = Math.round(39 * intensity + 234 * (1 - intensity))
                  const bx1 = scalePosition(binStart)
                  const bx2 = scalePosition(Math.min(binEnd, graph.stop))
                  elements.push(
                    <rect
                      key={`alt-${rowIndex}-${i}`}
                      x={bx1} y={y}
                      width={bx2 - bx1} height={ROW_HEIGHT}
                      fill={`rgb(${r},${g},${b})`}
                      rx={1}
                    >
                      <title>{`${altCount} variant(s) in bin`}</title>
                    </rect>
                  )
                }
              }

              return <g key={`heatmap-row-${rowIndex}`}>{elements}</g>
            })}

          </svg>
        )
      }}
    </Track>
  )
}

export default HeatmapTrack
