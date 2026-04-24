import React from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { VariationGraph, ColumnFlow, InterColumnFlow } from './variation-graph'
import { VARIANT_TYPE_COLORS } from './colors'
import HaplotypeHelpButton from './HelpButton'

const TRACK_HEIGHT = 200
const BACKBONE_Y = TRACK_HEIGHT * 0.75
const ALT_ZONE_TOP = 15
const MAX_BACKBONE_THICKNESS = 16
const MAX_ALT_THICKNESS = 12

type Props = {
  graph: VariationGraph
}

/** Scale a haplotype count to a ribbon thickness */
const ribbonThickness = (weight: number, total: number, max: number): number => {
  if (total <= 0 || weight <= 0) return 0.5
  const fraction = weight / total
  return Math.max(0.5, fraction * max)
}

/** Get the y-center for the alt ribbon at a column, based on its weight */
const altY = (altWeight: number, total: number): number => {
  if (total <= 0 || altWeight <= 0) return BACKBONE_Y - 20
  const fraction = altWeight / total
  // Higher AF = closer to backbone (less dramatic arc), lower AF = higher up
  // Range: ALT_ZONE_TOP (rare) to BACKBONE_Y - 30 (common)
  return BACKBONE_Y - 30 - (1 - fraction) * (BACKBONE_Y - 30 - ALT_ZONE_TOP)
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

const BubbleHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The variation graph (bubble) view shows haplotype flow through variant sites.
      At each variant, the flow splits: some haplotypes stay on the reference backbone,
      others diverge to the alternate path above. Between variant sites, ribbons show
      how haplotype bundles transition.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Grey backbone</strong> — The reference path. Thickness shows how many haplotypes carry the reference allele.</li>
      <li><strong>Colored arcs above</strong> — Alternate allele paths. Thickness shows carrier count.</li>
      <li><strong>Connecting ribbons</strong> — Flow between consecutive variant sites. Curved ribbons show haplotypes transitioning between ref and alt paths.</li>
      <li><strong>Color</strong> — Variant type: blue=SNV, red=DEL, green=INS, purple=DUP.</li>
      <li><strong>Shaded backgrounds</strong> — Superbubbles: consecutive variants co-inherited by the same haplotypes (perfect LD).</li>
    </ul>

    <h4>Flow Patterns</h4>
    <ul>
      <li><strong>Wide backbone + thin arc</strong> — Rare variant (few carriers).</li>
      <li><strong>Backbone and arc similar width</strong> — Common variant (~50% AF).</li>
      <li><strong>Connected arcs across sites</strong> — Linked variants on the same haplotypes (LD).</li>
      <li><strong>Crossing ribbons</strong> — Recombination: haplotypes that carried alt at one site switch to ref at the next.</li>
    </ul>

    <h4>Hover</h4>
    <p>Hover over arcs for variant details, or over ribbons for transition counts.</p>
  </>
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

const BubbleTrack = ({ graph }: Props) => {
  const { columns, transitions, totalHaplotypes, bubbles } = graph
  const bubbleCount = bubbles.length
  const superbubbleCount = bubbles.filter((b) => b.isSuperbubble).length

  return (
    <Track
      renderLeftPanel={() => (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 0 2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Variation Graph</span>
            <HaplotypeHelpButton title="Variation Graph (Bubble) — How to Read This View">
              <BubbleHelp />
            </HaplotypeHelpButton>
          </div>
          <svg width={200} height={75}>
            <text x={0} y={12} fontSize="9" fill="#666">
              {bubbleCount} bubbles{superbubbleCount > 0 ? `, ${superbubbleCount} superbubbles` : ''}
            </text>
            <text x={0} y={24} fontSize="9" fill="#666">
              {totalHaplotypes} haplotypes
            </text>
            {/* Legend */}
            <rect x={5} y={33} width={20} height={6} fill="#999" rx={1} />
            <text x={30} y={40} fontSize="8" fill="#333">Ref backbone (thickness = count)</text>
            <rect x={5} y={48} width={20} height={4} fill={VARIANT_TYPE_COLORS.snv} rx={1} />
            <text x={30} y={54} fontSize="8" fill="#333">Alt path (colored by type)</text>
            <path d="M 5 68 C 10 60, 20 60, 25 68" fill="rgba(100,100,100,0.15)" stroke="none" />
            <text x={30} y={70} fontSize="8" fill="#333">Flow ribbon (transition)</text>
          </svg>
        </div>
      )}
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
                    fill="#aaa"
                    opacity={0.8}
                  />
                )
              }

              // alt→alt ribbon (linked alt path between columns — superbubble flow)
              if (t.altToAlt > 0) {
                const thickness = ribbonThickness(t.altToAlt, totalHaplotypes, MAX_ALT_THICKNESS)
                const color = getColor(fromLayout.col.alleleType)
                elements.push(
                  <path
                    key={`aa-${i}`}
                    d={ribbonPath(
                      fromLayout.x, fromLayout.ay, thickness,
                      toLayout.x, toLayout.ay, thickness
                    )}
                    fill={color}
                    opacity={0.45}
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
                    fill={getColor(toLayout.col.alleleType)}
                    opacity={0.3}
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
                    fill={getColor(fromLayout.col.alleleType)}
                    opacity={0.3}
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
                x={x - 2}
                y={BACKBONE_Y - refT / 2}
                width={4}
                height={refT}
                fill="#888"
                rx={1}
              />
            ))}

            {/* Alt nodes at each column with fork/merge lines */}
            {colLayout.map(({ x, ay, altT, col }, i) => {
              if (col.altWeight <= 0) return null
              const color = getColor(col.alleleType)
              const halfT = Math.max(altT / 2, 2)
              const refT = ribbonThickness(col.refWeight, totalHaplotypes, MAX_BACKBONE_THICKNESS)

              return (
                <TooltipAnchor
                  key={`alt-${i}`}
                  tooltipComponent={() => <ColumnTooltip col={col} total={totalHaplotypes} />}
                >
                  <g>
                    {/* Vertical fork/merge line connecting backbone to alt node */}
                    <line
                      x1={x} y1={BACKBONE_Y - refT / 2}
                      x2={x} y2={ay + halfT}
                      stroke={color}
                      strokeWidth={Math.max(1.5, altT * 0.5)}
                      opacity={0.5}
                    />
                    {/* Alt node marker */}
                    <ellipse
                      cx={x}
                      cy={ay}
                      rx={Math.max(3, altT * 0.4)}
                      ry={halfT}
                      fill={color}
                      opacity={0.85}
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
                stroke={getColor(col.alleleType)}
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
