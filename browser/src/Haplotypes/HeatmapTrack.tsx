import React, { useMemo } from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import { PangenomeGraph } from './pangenome-graph'
import HaplotypeHelpButton from './HelpButton'

const HeatmapHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The binned heatmap (ODGI-style) shows each haplotype group as a horizontal row.
      The genomic region is divided into bins, and each bin is colored by the number of
      alternate alleles that haplotype carries in that bin.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong style={{ color: '#dde4ea' }}>Light blue-gray</strong> — Reference. No alternate alleles in this bin.</li>
      <li><strong style={{ color: 'rgb(218,138,137)' }}>Light coral</strong> — 1 alternate allele in this bin.</li>
      <li><strong style={{ color: 'rgb(216,93,88)' }}>Dark coral</strong> — 2 alternate alleles in this bin.</li>
      <li><strong style={{ color: '#d73027' }}>Red</strong> — 3 or more alternate alleles in this bin.</li>
    </ul>

    <h4>Left Panel Labels</h4>
    <ul>
      <li><strong>Orange circle + number</strong> — Sample count (how many haplotypes share this group)</li>
      <li><strong>Gray circle + number</strong> — Variant count (total variant sites in this group)</li>
      <li>Hover any label to see full details: genomic coordinates, size, and sample IDs.</li>
    </ul>

    <h4>Interpreting Patterns</h4>
    <ul>
      <li><strong>Vertical red stripes</strong> indicate variant hotspots where many haplotype groups carry alternate alleles.</li>
      <li><strong>Horizontal red rows</strong> indicate haplotype groups with many variants across the region.</li>
      <li><strong>White/light columns</strong> indicate conserved regions with few variants.</li>
      <li>Rows are sorted by sample count (most common haplotypes at top).</li>
    </ul>

    <h4>Limitations</h4>
    <ul>
      <li>Only the top 80 groups by sample count are shown.</li>
      <li>The region is divided into 100 bins, so individual variants may be merged within a bin.</li>
      <li>The AF threshold slider filters which variants define groups.</li>
    </ul>
  </>
)

const ROW_HEIGHT = 12
const ROW_GAP = 2
const MAX_ROWS = 80
const NUM_BINS = 100
const LEFT_PANEL_OFFSET = 35

type Props = {
  graph: PangenomeGraph
}

const HeatmapTrack = ({ graph }: Props) => {
  const paths = useMemo(
    () => [...graph.paths].sort((a, b) => b.sampleCount - a.sampleCount),
    [graph.paths]
  )
  const displayPaths = paths.slice(0, MAX_ROWS)
  const truncated = paths.length > MAX_ROWS

  const totalRows = displayPaths.length
  const plotHeight = Math.max(60, LEFT_PANEL_OFFSET + totalRows * (ROW_HEIGHT + ROW_GAP) + 25)
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
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0 2px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Haplotype Heatmap</span>
            <HaplotypeHelpButton title="Binned Heatmap — How to Read This View">
              <HeatmapHelp />
            </HaplotypeHelpButton>
          </div>
          <svg width={200} height={plotHeight}>
            <text x={0} y={12} fontSize='9' fill='#666'>
              {displayPaths.length} of {paths.length} groups
              {truncated ? ' (truncated)' : ''}
            </text>
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

            {/* Legend at bottom */}
            {(() => {
              const legendY = LEFT_PANEL_OFFSET + totalRows * (ROW_HEIGHT + ROW_GAP) + 5
              const legendItems = [
                { label: 'Reference', color: '#dde4ea' },
                { label: '1 variant', color: 'rgb(218,138,137)' },
                { label: '2+ variants', color: 'rgb(216,93,88)' },
                { label: '3+ variants', color: '#d73027' },
              ]
              return (
                <g>
                  {legendItems.map((item, i) => (
                    <g key={`legend-${i}`}>
                      <rect x={i * 100} y={legendY} width={10} height={8} fill={item.color} rx={1} />
                      <text x={i * 100 + 13} y={legendY + 7} fontSize={7} fill='#555'>{item.label}</text>
                    </g>
                  ))}
                </g>
              )
            })()}
          </svg>
        )
      }}
    </Track>
  )
}

export default HeatmapTrack
