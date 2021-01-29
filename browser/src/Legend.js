import PropTypes from 'prop-types'
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

const LegendSwatch = ({ color }) => (
  <svg width={16} height={16}>
    <rect x={0} y={0} height={16} width={16} fill={color} stroke="#000" />
  </svg>
)

LegendSwatch.propTypes = {
  color: PropTypes.string.isRequired,
}

const Legend = ({ series }) => (
  <LegendWrapper>
    {series.map(({ color, label, swatch }) => (
      <LegendItem key={label}>
        {color ? <LegendSwatch color={color} /> : swatch}
        <span style={{ marginLeft: '0.25em' }}>{label}</span>
      </LegendItem>
    ))}
  </LegendWrapper>
)

Legend.propTypes = {
  series: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string,
      label: PropTypes.string.isRequired,
      swatch: PropTypes.node,
    })
  ).isRequired,
}

export default Legend

export const StripedSwatch = ({ id, color }) => (
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

StripedSwatch.propTypes = {
  id: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
}
