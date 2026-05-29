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
 */
export const VariantShapeLegend = ({ showPhantomRegions = false }: { showPhantomRegions?: boolean }) => {
  const renderers = showPhantomRegions ? EXPANDED_SHAPE_RENDERERS : COMPACT_SHAPE_RENDERERS
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
