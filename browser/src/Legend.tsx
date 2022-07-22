import React from 'react'
import styled from 'styled-components'

const LegendWrapper = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0 1em 0 0;
  list-style-type: none;
`

const LegendItem = styled.li`
  display: flex;
  margin-left: 1em;

  &:first-child {
    margin-left: 0;
  }
`

type LegendSwatchProps = {
  color: string
}

const LegendSwatch = ({ color }: LegendSwatchProps) => (
  <svg width={16} height={16}>
    <rect x={0} y={0} height={16} width={16} fill={color} stroke="#000" />
  </svg>
)

type LegendProps = {
  series: {
    color?: string
    label: string
    swatch?: React.ReactNode
  }[]
}

const Legend = ({ series }: LegendProps) => (
  <LegendWrapper>
    {series.map(({ color, label, swatch }) => (
      <LegendItem key={label}>
        {color ? <LegendSwatch color={color} /> : swatch}
        <span style={{ marginLeft: '0.25em' }}>{label}</span>
      </LegendItem>
    ))}
  </LegendWrapper>
)

export default Legend

type StripedSwatchProps = {
  id: string
  color: string
}

export const StripedSwatch = ({ id, color }: StripedSwatchProps) => (
  <svg width={16} height={16}>
    <defs>
      <pattern
        id={`${id}-stripes`}
        width={4}
        height={4}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width={3} height={4} transform="translate(0,0)" fill="#fff" />
      </pattern>
      <mask id={`${id}-mask`}>
        <rect x={0} y={0} width="100%" height="100%" fill={`url(#${id}-stripes)`} />
      </mask>
    </defs>
    <rect x={0} y={0} width={16} height={16} fill={color} mask={`url(#${id}-mask)`} />
    <rect x={0} y={0} width={16} height={16} fill="none" stroke="#333" />
  </svg>
)
