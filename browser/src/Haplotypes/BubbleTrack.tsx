import React from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { VariationGraph, Bubble } from './variation-graph'
import { VARIANT_TYPE_COLORS } from './colors'
import HaplotypeHelpButton from './HelpButton'

const TRACK_HEIGHT = 200
const BACKBONE_Y = TRACK_HEIGHT * 0.65
const MIN_ARC_WIDTH = 8
const MAX_ARC_HEIGHT = BACKBONE_Y - 20
const BACKBONE_STROKE = 4

type Props = {
  graph: VariationGraph
}

const getArcHeight = (weight: number, totalHaplotypes: number): number => {
  if (weight <= 0 || totalHaplotypes <= 0) return 10
  const fraction = weight / totalHaplotypes
  return Math.max(10, Math.min(MAX_ARC_HEIGHT, 20 + fraction * MAX_ARC_HEIGHT * 0.8))
}

const getStrokeWidth = (weight: number): number => {
  if (weight <= 0) return 1
  return Math.max(1, Math.min(8, 1 + Math.log2(weight)))
}

const getColor = (alleleType: string): string => {
  const normalized = alleleType.toLowerCase()
  return VARIANT_TYPE_COLORS[normalized] || VARIANT_TYPE_COLORS.other
}

const BubbleTooltip = ({ bubble }: { bubble: Bubble }) => {
  const af = bubble.totalHaplotypes > 0 ? (bubble.weight / bubble.totalHaplotypes).toFixed(4) : 'N/A'
  return (
    <dl style={{ margin: 0 }}>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Type:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{bubble.alleleType}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Position:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{bubble.position.toLocaleString()}</dd>
      </div>
      {!bubble.isSuperbubble && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Alleles:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
            {bubble.alleles[0]?.length > 15 ? bubble.alleles[0].substring(0, 15) + '...' : bubble.alleles[0]}
            {' → '}
            {bubble.alleles[1]?.length > 15 ? bubble.alleles[1].substring(0, 15) + '...' : bubble.alleles[1]}
          </dd>
        </div>
      )}
      {bubble.isSuperbubble && bubble.mergedBubbles && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Variants:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{bubble.mergedBubbles.length} linked sites</dd>
        </div>
      )}
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Carriers:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{bubble.weight} / {bubble.totalHaplotypes}</dd>
      </div>
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>AF:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{af}</dd>
      </div>
      {bubble.alleleLength > 0 && (
        <div>
          <dt style={{ display: 'inline', fontWeight: 'bold' }}>Length:</dt>
          <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{bubble.alleleLength} bp</dd>
        </div>
      )}
      <div>
        <dt style={{ display: 'inline', fontWeight: 'bold' }}>Span:</dt>
        <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
          {bubble.span[0].toLocaleString()} – {bubble.span[1].toLocaleString()}
        </dd>
      </div>
    </dl>
  )
}

const BubbleHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The variation graph (bubble) view shows how haplotypes diverge from the reference
      at each variant site. Each arc represents an alternate allele path — its height
      and thickness indicate how many haplotypes carry that variant.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Grey backbone</strong> — The reference path. Most haplotypes travel along it.</li>
      <li><strong>Colored arcs</strong> — Alternate allele paths arcing above the backbone.</li>
      <li><strong>Arc height</strong> — Proportional to carrier frequency (more carriers = taller).</li>
      <li><strong>Arc thickness</strong> — Proportional to log(carrier count).</li>
      <li><strong>Arc color</strong> — Variant type: blue=SNV, red=DEL, green=INS, purple=DUP.</li>
      <li><strong>Shaded backgrounds</strong> — Superbubbles: consecutive variants always co-inherited (perfect LD).</li>
    </ul>

    <h4>Arc Width</h4>
    <ul>
      <li><strong>SNVs/Insertions</strong> — Small fixed-width arcs at the variant position.</li>
      <li><strong>Deletions</strong> — Arc spans from variant start to start + deletion length.</li>
    </ul>

    <h4>Hover</h4>
    <p>Hover over any arc for variant details, carrier count, and allele frequency.</p>
  </>
)

const BubbleTrack = ({ graph }: Props) => {
  const bubbleCount = graph.bubbles.length
  const superbubbleCount = graph.bubbles.filter((b) => b.isSuperbubble).length

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
          <svg width={200} height={60}>
            <text x={0} y={12} fontSize="9" fill="#666">
              {bubbleCount} bubbles{superbubbleCount > 0 ? `, ${superbubbleCount} superbubbles` : ''}
            </text>
            {/* Legend */}
            <line x1={5} y1={28} x2={25} y2={28} stroke="#999" strokeWidth={BACKBONE_STROKE} />
            <text x={30} y={31} fontSize="8" fill="#333">Reference backbone</text>
            <path d="M 5 48 Q 15 36 25 48" fill="none" stroke={VARIANT_TYPE_COLORS.snv} strokeWidth={2} />
            <text x={30} y={51} fontSize="8" fill="#333">Alt arc (colored by type)</text>
          </svg>
        </div>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
        if (graph.bubbles.length === 0) {
          return (
            <svg width={width} height={100}>
              <text x={width / 2} y={50} textAnchor="middle" fill="#666" fontSize="12">
                No variant sites in region
              </text>
            </svg>
          )
        }

        return (
          <svg width={width} height={TRACK_HEIGHT}>
            {/* Superbubble background rects */}
            {graph.bubbles
              .filter((b) => b.isSuperbubble)
              .map((bubble, i) => {
                const x1 = scalePosition(bubble.span[0])
                const x2 = scalePosition(bubble.span[1])
                return (
                  <rect
                    key={`superbubble-bg-${i}`}
                    x={x1 - 2}
                    y={10}
                    width={Math.max(4, x2 - x1 + 4)}
                    height={TRACK_HEIGHT - 20}
                    fill="#f0e6ff"
                    opacity={0.4}
                    rx={3}
                  />
                )
              })}

            {/* Reference backbone */}
            <line
              x1={0}
              y1={BACKBONE_Y}
              x2={width}
              y2={BACKBONE_Y}
              stroke="#999"
              strokeWidth={BACKBONE_STROKE}
              strokeLinecap="round"
            />

            {/* Bubble arcs */}
            {graph.bubbles.map((bubble, i) => {
              if (bubble.isSuperbubble && bubble.mergedBubbles) {
                // Render individual arcs within superbubble
                return bubble.mergedBubbles.map((sub, si) => {
                  const x1 = scalePosition(sub.position)
                  const arcWidth =
                    sub.alleleType === 'del' && sub.alleleLength > 0
                      ? Math.max(MIN_ARC_WIDTH, scalePosition(sub.position + sub.alleleLength) - x1)
                      : MIN_ARC_WIDTH
                  const x2 = x1 + arcWidth
                  const midX = (x1 + x2) / 2
                  const arcH = getArcHeight(sub.weight, sub.totalHaplotypes)
                  const arcY = BACKBONE_Y - arcH
                  const sw = getStrokeWidth(sub.weight)
                  const color = getColor(sub.alleleType)

                  return (
                    <TooltipAnchor
                      key={`super-${i}-arc-${si}`}
                      tooltipComponent={() => <BubbleTooltip bubble={sub} />}
                    >
                      <path
                        d={`M ${x1} ${BACKBONE_Y} Q ${midX} ${arcY} ${x2} ${BACKBONE_Y}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={sw}
                        opacity={0.7}
                      />
                    </TooltipAnchor>
                  )
                })
              }

              // Simple bubble
              const x1 = scalePosition(bubble.position)
              const arcWidth =
                bubble.alleleType === 'del' && bubble.alleleLength > 0
                  ? Math.max(MIN_ARC_WIDTH, scalePosition(bubble.position + bubble.alleleLength) - x1)
                  : MIN_ARC_WIDTH
              const x2 = x1 + arcWidth
              const midX = (x1 + x2) / 2
              const arcH = getArcHeight(bubble.weight, bubble.totalHaplotypes)
              const arcY = BACKBONE_Y - arcH
              const sw = getStrokeWidth(bubble.weight)
              const color = getColor(bubble.alleleType)

              return (
                <TooltipAnchor
                  key={`bubble-${i}`}
                  tooltipComponent={() => <BubbleTooltip bubble={bubble} />}
                >
                  <path
                    d={`M ${x1} ${BACKBONE_Y} Q ${midX} ${arcY} ${x2} ${BACKBONE_Y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={sw}
                    opacity={0.7}
                  />
                </TooltipAnchor>
              )
            })}

            {/* Variant position markers on backbone */}
            {graph.bubbles
              .filter((b) => !b.isSuperbubble)
              .map((bubble, i) => {
                const cx = scalePosition(bubble.position)
                return (
                  <circle
                    key={`marker-${i}`}
                    cx={cx}
                    cy={BACKBONE_Y}
                    r={2}
                    fill={getColor(bubble.alleleType)}
                    stroke="#fff"
                    strokeWidth={0.5}
                  />
                )
              })}
          </svg>
        )
      }}
    </Track>
  )
}

export default BubbleTrack
