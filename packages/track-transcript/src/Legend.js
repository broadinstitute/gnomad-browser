import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

export const Legend = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0;
  list-style-type: none;
`

const LegendItemWrapper = styled.li`
  display: flex;
  align-items: center;
  margin-left: 1em;
`

const LegendSwatch = styled.span`
  width: 16px;
  height: ${props => props.height}px;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: block;
    width: 16px;
    height: ${props => props.height}px;
    background: ${props => props.color};
  }
`

export const LegendItem = ({ color, height, label }) => (
  <LegendItemWrapper>
    <LegendSwatch color={color} height={height} />
    {label}
  </LegendItemWrapper>
)

LegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
}
