import React from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { VariationGraph, ColumnFlow, InterColumnFlow } from './variation-graph'
import { VARIANT_TYPE_COLORS, SUPERPOPULATION_COLORS } from './colors'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

const TRACK_HEIGHT = 220
const BACKBONE_Y = TRACK_HEIGHT * 0.75
const ALT_ZONE_TOP = 15
const MAX_BACKBONE_THICKNESS = 24
const MAX_ALT_THICKNESS = 18
const MIN_RIBBON = 1.5

type Props = {
  graph: VariationGraph
  colorMode?: string
  sampleMetadata?: SampleMetadataMap
}

/** Scale a haplotype count to a ribbon thickness using sqrt for visibility */
const ribbonThickness = (weight: number, total: number, max: number): number => {
  if (total <= 0 || weight <= 0) return MIN_RIBBON
  const fraction = weight / total
  return Math.max(MIN_RIBBON, Math.sqrt(fraction) * max)
}

/** Get the y-center for the alt ribbon at a column, based on its weight */
const altY = (altWeight: number, total: number): number => {
  if (total <= 0 || altWeight <= 0) return BACKBONE_Y - 30
  const fraction = altWeight / total
  // sqrt so rare variants don't all cluster at the top
  const sqrtFraction = Math.sqrt(fraction)
  // Higher AF = closer to backbone, lower AF = higher up
  return BACKBONE_Y - 35 - (1 - sqrtFraction) * (BACKBONE_Y - 35 - ALT_ZONE_TOP)
}

const getColor = (alleleType: string): string => {
  const normalized = alleleType.toLowerCase()
  return VARIANT_TYPE_COLORS[normalized] || VARIANT_TYPE_COLORS.other
}

const ColumnTooltip = ({ col, total }: { col: ColumnFlow; total: number }) => {
  const af = total > 0 ? (col.altWeight / total).toFixed(4) : 'N/A'
  return (
    <dl style={{ margin: 0 }}>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Type:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.alleleType}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Position:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.position.toLocaleString()}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Alleles:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
          {col.alleles[0]?.length > 15 ? col.alleles[0].substring(0, 15) + '...' : col.alleles[0]}
          {' → '}
          {col.alleles[1]?.length > 15 ? col.alleles[1].substring(0, 15) + '...' : col.alleles[1]}
        </dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Ref haplotypes:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.refWeight}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Alt haplotypes:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.altWeight}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>AF:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{af}</dd>
      </div>
      {col.alleleLength > 0 && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Length:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.alleleLength} bp</dd>
        </div>
      )}
      {col.trMinLengthDiff != null && col.trMaxLengthDiff != null && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Length range:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.trMinLengthDiff} to {col.trMaxLengthDiff} bp</dd>
        </div>
      )}
      {col.trDistinctAlleles != null && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Distinct alleles:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{col.trDistinctAlleles}</dd>
        </div>
      )}
    </dl>
  )
}

const TransitionTooltip = ({ t, total }: { t: InterColumnFlow; total: number }) => (
  <dl style={{ margin: 0 }}>
    <div>
      <dt style={{ display: 'inline', fontWeight: 'bold' }}>From:</dt>
      <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.fromPos.toLocaleString()}</dd>
    </div>
    <div>
      <dt style={{ display: 'inline', fontWeight: 'bold' }}>To:</dt>
      <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.toPos.toLocaleString()}</dd>
    </div>
    <div>
      <dt style={{ display: 'inline', fontWeight: 'bold' }}>ref→ref:</dt>
      <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.refToRef} ({total > 0 ? ((t.refToRef / total) * 100).toFixed(1) : 0}%)</dd>
    </div>
    {t.refToAlt > 0 && (
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>ref→alt:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.refToAlt}</dd>
      </div>
    )}
    {t.altToRef > 0 && (
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>alt→ref:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.altToRef}</dd>
      </div>
    )}
    {t.altToAlt > 0 && (
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>alt→alt:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{t.altToAlt} (linked)</dd>
      </div>
    )}
  </dl>
)

/**
 * Build an SVG cubic bezier ribbon between two y-positions at two x-positions.
 * The ribbon has a given thickness (half above, half below the center line).
 */
const ribbonPath = (
  x1: number, y1: number, t1: number,
  x2: number, y2: number, t2: number,
): string => {
  const cpx = (x1 + x2) / 2
  const top1 = y1 - t1 / 2
  const bot1 = y1 + t1 / 2
  const top2 = y2 - t2 / 2
  const bot2 = y2 + t2 / 2

  return [
    `M ${x1} ${top1}`,
    `C ${cpx} ${top1}, ${cpx} ${top2}, ${x2} ${top2}`,
    `L ${x2} ${bot2}`,
    `C ${cpx} ${bot2}, ${cpx} ${bot1}, ${x1} ${bot1}`,
    'Z',
  ].join(' ')
}

/** Get dominant superpopulation from a set of sample IDs */
const getDominantPopForSamples = (
  sampleIds: Set<string> | string[],
  sampleMetadata: SampleMetadataMap,
): string => {
  const counts: Record<string, number> = {}
  for (const sid of sampleIds) {
    const meta = sampleMetadata.get(sid)
    const pop = meta?.superpopulation || 'N/A'
    counts[pop] = (counts[pop] || 0) + 1
  }
  let maxPop = 'N/A'
  let maxCount = 0
  for (const [pop, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; maxPop = pop }
  }
  return maxPop
}

const BubbleTrack = ({ graph, colorMode, sampleMetadata }: Props) => {
  const { columns, transitions, totalHaplotypes, bubbles, edges } = graph

  const usePopColors = colorMode === 'population' && sampleMetadata && sampleMetadata.size > 0

  // Pre-compute population color for each alt node position
  const popColorByPos = React.useMemo(() => {
    if (!usePopColors) return null
    const colorMap = new Map<number, string>()
    for (const col of columns) {
      const altNodeId = `alt-${col.position}`
      // Collect all haplotypes that reach this alt node
      const altHaps = new Set<string>()
      for (const [, edge] of edges) {
        if (edge.target === altNodeId) {
          for (const h of edge.haplotypes) altHaps.add(h)
        }
      }
      if (altHaps.size > 0) {
        const pop = getDominantPopForSamples(altHaps, sampleMetadata!)
        colorMap.set(col.position, SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A'])
      }
    }
    return colorMap
  }, [usePopColors, columns, edges, sampleMetadata])

  /** Get color for a column, using population or variant type */
  const getColColor = (col: ColumnFlow): string => {
    if (popColorByPos) {
      return popColorByPos.get(col.position) || SUPERPOPULATION_COLORS['N/A']
    }
    return getColor(col.alleleType)
  }

  return (
    <Track
      renderLeftPanel={() => <div style={{ width: 200 }} />}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
        if (columns.length === 0) {
          return (
            <svg width={width} height={100}>
              <text x={width / 2} y={50} textAnchor="middle" fill="#666" fontSize="12">
                No variant sites in region
              </text>
            </svg>
          )
        }

        // Pre-compute x positions and y positions for each column
        const colLayout = columns.map((col) => {
          const x = scalePosition(col.position)
          const refT = ribbonThickness(col.refWeight, totalHaplotypes, MAX_BACKBONE_THICKNESS)
          const altT = ribbonThickness(col.altWeight, totalHaplotypes, MAX_ALT_THICKNESS)
          const ay = altY(col.altWeight, totalHaplotypes)
          return { x, refT, altT, ay, col }
        })

        return (
          <svg width={width} height={TRACK_HEIGHT}>
            {/* Superbubble background rects */}
            {bubbles
              .filter((b) => b.isSuperbubble)
              .map((bubble, i) => {
                const x1 = scalePosition(bubble.span[0])
                const x2 = scalePosition(bubble.span[1])
                return (
                  <rect
                    key={`superbubble-bg-${i}`}
                    x={x1 - 2}
                    y={ALT_ZONE_TOP - 5}
                    width={Math.max(4, x2 - x1 + 4)}
                    height={BACKBONE_Y - ALT_ZONE_TOP + 20}
                    fill="#f0e6ff"
                    opacity={0.3}
                    rx={3}
                  />
                )
              })}

            {/* Inter-column transition ribbons */}
            {transitions.map((t, i) => {
              const fromLayout = colLayout[i]
              const toLayout = colLayout[i + 1]
              if (!fromLayout || !toLayout) return null

              const elements: React.ReactNode[] = []

              // ref→ref ribbon (backbone between columns)
              if (t.refToRef > 0) {
                const thickness = ribbonThickness(t.refToRef, totalHaplotypes, MAX_BACKBONE_THICKNESS)
                elements.push(
                  <path
                    key={`rr-${i}`}
                    d={ribbonPath(
                      fromLayout.x, BACKBONE_Y, thickness,
                      toLayout.x, BACKBONE_Y, thickness
                    )}
                    fill="#999"
                    opacity={0.85}
                  />
                )
              }

              // alt→alt ribbon (linked alt path between columns — superbubble flow)
              if (t.altToAlt > 0) {
                const thickness = ribbonThickness(t.altToAlt, totalHaplotypes, MAX_ALT_THICKNESS)
                const color = getColColor(fromLayout.col)
                elements.push(
                  <path
                    key={`aa-${i}`}
                    d={ribbonPath(
                      fromLayout.x, fromLayout.ay, thickness,
                      toLayout.x, toLayout.ay, thickness
                    )}
                    fill={color}
                    opacity={0.55}
                  />
                )
              }

              // ref→alt ribbon (haplotypes joining alt path)
              if (t.refToAlt > 0) {
                const thickness = ribbonThickness(t.refToAlt, totalHaplotypes, MAX_ALT_THICKNESS)
                elements.push(
                  <path
                    key={`ra-${i}`}
                    d={ribbonPath(
                      fromLayout.x, BACKBONE_Y, thickness,
                      toLayout.x, toLayout.ay, thickness
                    )}
                    fill={getColColor(toLayout.col)}
                    opacity={0.4}
                  />
                )
              }

              // alt→ref ribbon (haplotypes returning to ref path)
              if (t.altToRef > 0) {
                const thickness = ribbonThickness(t.altToRef, totalHaplotypes, MAX_ALT_THICKNESS)
                elements.push(
                  <path
                    key={`ar-${i}`}
                    d={ribbonPath(
                      fromLayout.x, fromLayout.ay, thickness,
                      toLayout.x, BACKBONE_Y, thickness
                    )}
                    fill={getColColor(fromLayout.col)}
                    opacity={0.4}
                  />
                )
              }

              if (elements.length === 0) return null

              return (
                <TooltipAnchor
                  key={`transition-${i}`}
                  tooltipComponent={() => <TransitionTooltip t={t} total={totalHaplotypes} />}
                >
                  <g>{elements}</g>
                </TooltipAnchor>
              )
            })}

            {/* Reference backbone node markers at each column */}
            {colLayout.map(({ x, refT }, i) => (
              <rect
                key={`ref-${i}`}
                x={x - 3}
                y={BACKBONE_Y - refT / 2}
                width={6}
                height={refT}
                fill="#777"
                rx={2}
              />
            ))}

            {/* Alt nodes at each column — shape varies by SV type */}
            {colLayout.map(({ x, ay, altT, col }, i) => {
              if (col.altWeight <= 0) return null
              const color = getColColor(col)
              const halfT = Math.max(altT / 2, 3)
              const refT = ribbonThickness(col.refWeight, totalHaplotypes, MAX_BACKBONE_THICKNESS)
              const sw = Math.max(2, altT * 0.5)
              const t = col.alleleType.toLowerCase()
              const absLen = Math.abs(col.alleleLength)

              // Deletion: wide arc spanning the deleted region
              if (t === 'del' && absLen > 0) {
                const x2 = scalePosition(col.position + absLen)
                const span = Math.max(12, x2 - x)
                const midX = x + span / 2
                const arcPeakY = ay - Math.min(30, span * 0.15)
                return (
                  <TooltipAnchor
                    key={`alt-${i}`}
                    tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                  >
                    <g>
                      {/* Fork line at start */}
                      <line x1={x} y1={BACKBONE_Y - refT / 2} x2={x} y2={ay} stroke={color} strokeWidth={sw} opacity={0.5} />
                      {/* Wide deletion arc */}
                      <path
                        d={`M ${x} ${BACKBONE_Y - refT / 2} Q ${midX} ${arcPeakY} ${x + span} ${BACKBONE_Y - refT / 2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={Math.max(2.5, altT * 0.6)}
                        opacity={0.75}
                        strokeDasharray="6 3"
                      />
                      {/* Merge line at end */}
                      <line x1={x + span} y1={BACKBONE_Y - refT / 2} x2={x + span} y2={ay} stroke={color} strokeWidth={sw * 0.7} opacity={0.3} />
                      {/* "DEL" label */}
                      {span > 30 && (
                        <text x={midX} y={arcPeakY - 4} textAnchor="middle" fontSize="8" fill={color} opacity={0.7}>
                          {absLen > 1000 ? `${(absLen / 1000).toFixed(1)}kb` : `${absLen}bp`}
                        </text>
                      )}
                    </g>
                  </TooltipAnchor>
                )
              }

              // Insertion: teardrop bump above the backbone
              if (t === 'ins' || t === 'alu_ins') {
                const bumpW = Math.max(8, Math.min(30, Math.sqrt(absLen) * 2))
                const bumpH = Math.max(12, Math.min(40, Math.sqrt(absLen) * 3))
                const peakY = BACKBONE_Y - refT / 2 - bumpH
                return (
                  <TooltipAnchor
                    key={`alt-${i}`}
                    tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                  >
                    <g>
                      {/* Insertion bump: a closed teardrop shape */}
                      <path
                        d={`M ${x} ${BACKBONE_Y - refT / 2}
                            C ${x - bumpW} ${BACKBONE_Y - refT / 2 - bumpH * 0.5},
                              ${x - bumpW * 0.3} ${peakY},
                              ${x} ${peakY}
                            C ${x + bumpW * 0.3} ${peakY},
                              ${x + bumpW} ${BACKBONE_Y - refT / 2 - bumpH * 0.5},
                              ${x} ${BACKBONE_Y - refT / 2}`}
                        fill={color}
                        opacity={0.35}
                        stroke={color}
                        strokeWidth={Math.max(1.5, altT * 0.4)}
                      />
                      {/* Size label for large insertions */}
                      {absLen > 50 && (
                        <text x={x} y={peakY - 4} textAnchor="middle" fontSize="7" fill={color} opacity={0.7}>
                          {absLen > 1000 ? `${(absLen / 1000).toFixed(1)}kb` : `${absLen}bp`}
                        </text>
                      )}
                    </g>
                  </TooltipAnchor>
                )
              }

              // Duplication types: diamond/loop-back shape
              if (t === 'dup' || t === 'dup_interspersed' || t === 'complex_dup' || t === 'inv_dup') {
                const loopW = Math.max(10, Math.min(40, Math.sqrt(absLen) * 1.5))
                const loopH = Math.max(15, Math.min(50, Math.sqrt(absLen) * 2.5))
                const peakY = BACKBONE_Y - refT / 2 - loopH
                const isDashed = t === 'inv_dup'
                return (
                  <TooltipAnchor
                    key={`alt-${i}`}
                    tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                  >
                    <g>
                      {/* Fork line */}
                      <line x1={x} y1={BACKBONE_Y - refT / 2} x2={x} y2={peakY + loopH * 0.3} stroke={color} strokeWidth={sw} opacity={0.5} />
                      {/* Diamond/loop shape */}
                      <path
                        d={`M ${x} ${BACKBONE_Y - refT / 2}
                            L ${x - loopW / 2} ${peakY + loopH * 0.4}
                            L ${x} ${peakY}
                            L ${x + loopW / 2} ${peakY + loopH * 0.4}
                            Z`}
                        fill={color}
                        opacity={0.3}
                        stroke={color}
                        strokeWidth={Math.max(1.5, altT * 0.4)}
                        strokeDasharray={isDashed ? '4 2' : 'none'}
                      />
                      {/* Size label */}
                      {absLen > 100 && (
                        <text x={x} y={peakY - 4} textAnchor="middle" fontSize="7" fill={color} opacity={0.7}>
                          {absLen > 1000 ? `${(absLen / 1000).toFixed(1)}kb` : `${absLen}bp`}
                        </text>
                      )}
                    </g>
                  </TooltipAnchor>
                )
              }

              // Tandem repeat variant: horizontal bar with repeat-unit tick marks
              if (t === 'trv') {
                const barW = Math.max(12, Math.min(40, (col.trDistinctAlleles || 2) * 3))
                const barH = Math.max(halfT, 5)
                const barY = ay - barH / 2
                const numTicks = Math.min(8, Math.max(2, col.trDistinctAlleles || 3))
                const tickSpacing = barW / (numTicks + 1)

                return (
                  <TooltipAnchor
                    key={`alt-${i}`}
                    tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                  >
                    <g>
                      {/* Fork line from backbone */}
                      <line x1={x} y1={BACKBONE_Y - refT / 2} x2={x} y2={barY + barH} stroke={color} strokeWidth={sw} opacity={0.5} />
                      {/* Filled bar */}
                      <rect
                        x={x - barW / 2}
                        y={barY}
                        width={barW}
                        height={barH}
                        fill={color}
                        opacity={0.7}
                        rx={2}
                      />
                      {/* Repeat-unit tick marks */}
                      {Array.from({ length: numTicks }, (_, ti) => (
                        <line
                          key={ti}
                          x1={x - barW / 2 + tickSpacing * (ti + 1)}
                          y1={barY}
                          x2={x - barW / 2 + tickSpacing * (ti + 1)}
                          y2={barY + barH}
                          stroke="white"
                          strokeWidth={1}
                          opacity={0.6}
                        />
                      ))}
                    </g>
                  </TooltipAnchor>
                )
              }

              // SNV / other: default point ellipse with fork line
              return (
                <TooltipAnchor
                  key={`alt-${i}`}
                  tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                >
                  <g>
                    <line
                      x1={x} y1={BACKBONE_Y - refT / 2}
                      x2={x} y2={ay + halfT}
                      stroke={color}
                      strokeWidth={sw}
                      opacity={0.6}
                    />
                    <ellipse
                      cx={x}
                      cy={ay}
                      rx={Math.max(4, altT * 0.5)}
                      ry={Math.max(halfT, 4)}
                      fill={color}
                      opacity={0.9}
                    />
                  </g>
                </TooltipAnchor>
              )
            })}

            {/* Variant position tick marks on baseline */}
            {colLayout.map(({ x, col }, i) => (
              <line
                key={`tick-${i}`}
                x1={x}
                y1={BACKBONE_Y + MAX_BACKBONE_THICKNESS / 2 + 2}
                x2={x}
                y2={BACKBONE_Y + MAX_BACKBONE_THICKNESS / 2 + 6}
                stroke={getColColor(col)}
                strokeWidth={1}
                opacity={0.5}
              />
            ))}
          </svg>
        )
      }}
    </Track>
  )
}

export default BubbleTrack
