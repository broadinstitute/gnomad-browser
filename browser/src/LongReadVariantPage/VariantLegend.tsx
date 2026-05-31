import React from 'react'
import styled from 'styled-components'

import { VARIANT_CATEGORY_COLORS, VARIANT_CATEGORY_LABELS, type VariantCategory } from './variantUtils'

const LegendSection = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid lightgrey;
  border-radius: 5px;
  padding: 4px 6px;
  flex-wrap: wrap;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-right: 0.75em;
  font-size: 12px;
`

// Compact SVG shapes for each variant category in a 22x22 viewbox
const COMPACT_SHAPE_RENDERERS: Record<VariantCategory, (color: string) => React.ReactNode> = {
  snv: (color) => (
    <circle cx={11} cy={11} r={4} fill={color} stroke="#333" strokeWidth={0.5} />
  ),
  deletion: (color) => (
    <line x1={11} y1={4} x2={11} y2={18} stroke={color} strokeDasharray="4 2" strokeWidth={2.5} />
  ),
  insertion: (color) => (
    <path d="M 11 5 L 6 17 L 16 17 Z" fill={color} stroke={color} strokeWidth={0.5} />
  ),
  sv: (color) => (
    <path d="M 11 5 L 6 11 L 11 17 L 16 11 Z" fill={color} opacity={0.7} stroke={color} strokeWidth={0.5} />
  ),
  tr: (color) => (
    <g>
      <rect x={6} y={7} width={10} height={8} fill={color} opacity={0.8} rx={1.5} stroke={color} strokeWidth={0.5} />
      <line x1={9.5} y1={7} x2={9.5} y2={15} stroke="white" strokeWidth={0.7} opacity={0.6} />
      <line x1={12.5} y1={7} x2={12.5} y2={15} stroke="white" strokeWidth={0.7} opacity={0.6} />
    </g>
  ),
}

// Expanded (phantom bar) shapes for insertion/TR when accordion is ON
const EXPANDED_SHAPE_RENDERERS: Record<VariantCategory, (color: string) => React.ReactNode> = {
  ...COMPACT_SHAPE_RENDERERS,
  insertion: (color) => (
    <g>
      <rect x={2} y={8} width={18} height={6} fill={color} opacity={0.6} />
      <rect x={2} y={8} width={4} height={6} fill={color} />
    </g>
  ),
  tr: (color) => (
    <g>
      <rect x={2} y={8} width={18} height={6} fill={color} opacity={0.6} />
      <rect x={2} y={8} width={4} height={6} fill={color} />
    </g>
  ),
}

// Default export for backward compatibility — uses compact shapes
const SHAPE_RENDERERS = COMPACT_SHAPE_RENDERERS

const SHAPE_ORDER: VariantCategory[] = ['snv', 'insertion', 'deletion', 'sv', 'tr']

/**
 * Displays variant shape legend items using a neutral gray color.
 * When showPhantomRegions is true, insertion/TR shapes switch to expanded phantom bars.
 * Supports different plot types with type-appropriate legend items.
 */
export const VariantShapeLegend = ({ showPhantomRegions = false, plotType = 'lollipop' }: { showPhantomRegions?: boolean; plotType?: string }) => {
  const renderers = showPhantomRegions ? EXPANDED_SHAPE_RENDERERS : COMPACT_SHAPE_RENDERERS

  if (plotType === 'bubble') {
    const items: { label: string; render: React.ReactNode }[] = [
      { label: 'Ref backbone', render: <rect x={2} y={9} width={18} height={5} fill="#999" rx={1} /> },
      { label: 'SNV', render: <ellipse cx={11} cy={11} rx={4} ry={4} fill="#4A90D9" /> },
      { label: 'Deletion', render: <path d="M 3 14 Q 11 4 19 14" fill="none" stroke="#D73027" strokeWidth={2} strokeDasharray="4 2" /> },
      { label: 'Insertion', render: <path d="M 11 18 C 6 13, 9 8, 11 8 C 13 8, 16 13, 11 18" fill="#43A047" opacity={0.5} stroke="#43A047" strokeWidth={1} /> },
      { label: 'Duplication', render: <path d="M 11 16 L 7 11 L 11 6 L 15 11 Z" fill="#9467BD" opacity={0.4} stroke="#9467BD" strokeWidth={1} /> },
      { label: 'Tandem repeat', render: <><rect x={3} y={8} width={16} height={7} fill="#E8A838" opacity={0.7} rx={2} /><line x1={9} y1={8} x2={9} y2={15} stroke="white" strokeWidth={0.7} opacity={0.6} /><line x1={14} y1={8} x2={14} y2={15} stroke="white" strokeWidth={0.7} opacity={0.6} /></> },
    ]
    return (
      <LegendSection>
        <LegendItem><span style={{ fontWeight: 'bold' }}>Graph:</span></LegendItem>
        {items.map((item) => (
          <LegendItem key={item.label}>
            <svg width={22} height={22}>{item.render}</svg>
            <span>{item.label}</span>
          </LegendItem>
        ))}
      </LegendSection>
    )
  }

  if (plotType === 'alluvial') {
    return (
      <LegendSection>
        <LegendItem><span style={{ fontWeight: 'bold' }}>Flow:</span></LegendItem>
        <LegendItem>
          <svg width={22} height={22}><line x1={3} y1={11} x2={19} y2={11} stroke="#1f77b4" strokeWidth={4} strokeOpacity={0.55} /></svg>
          <span>Path (thickness = count)</span>
        </LegendItem>
        <LegendItem>
          <svg width={22} height={22}><circle cx={11} cy={11} r={4} fill="#4a90d9" stroke="#fff" strokeWidth={1} /></svg>
          <span>Ref node</span>
        </LegendItem>
        <LegendItem>
          <svg width={22} height={22}><circle cx={11} cy={11} r={4} fill="#d73027" stroke="#fff" strokeWidth={1} /></svg>
          <span>Alt node</span>
        </LegendItem>
      </LegendSection>
    )
  }

  if (plotType === 'heatmap') {
    const items: { label: string; color: string }[] = [
      { label: 'Reference', color: '#dde4ea' },
      { label: '1 variant', color: 'rgb(218,138,137)' },
      { label: '2+ variants', color: 'rgb(216,93,88)' },
      { label: '3+ variants', color: '#d73027' },
    ]
    return (
      <LegendSection>
        <LegendItem><span style={{ fontWeight: 'bold' }}>Bins:</span></LegendItem>
        {items.map((item) => (
          <LegendItem key={item.label}>
            <svg width={22} height={22}><rect x={4} y={6} width={14} height={10} fill={item.color} rx={2} /></svg>
            <span>{item.label}</span>
          </LegendItem>
        ))}
      </LegendSection>
    )
  }

  if (plotType === 'painting') {
    return null
  }

  // Default: lollipop
  return (
    <LegendSection>
      <LegendItem><span style={{ fontWeight: 'bold' }}>Variants:</span></LegendItem>
      {SHAPE_ORDER.map((cat) => (
        <LegendItem key={cat}>
          <svg width={22} height={22}>
            {renderers[cat]('#888')}
          </svg>
          <span>{VARIANT_CATEGORY_LABELS[cat]}</span>
        </LegendItem>
      ))}
    </LegendSection>
  )
}

/**
 * Displays variant color legend items using VARIANT_CATEGORY_COLORS with their shapes.
 * Used in the summary track to show what each color+shape combination means.
 */
export const VariantColorLegend = () => (
  <LegendSection>
    <LegendItem><span style={{ fontWeight: 'bold' }}>Type Colors:</span></LegendItem>
    {SHAPE_ORDER.map((cat) => (
      <LegendItem key={cat}>
        <svg width={22} height={22}>
          {SHAPE_RENDERERS[cat](VARIANT_CATEGORY_COLORS[cat])}
        </svg>
        <span>{VARIANT_CATEGORY_LABELS[cat]}</span>
      </LegendItem>
    ))}
  </LegendSection>
)

export { SHAPE_RENDERERS }
