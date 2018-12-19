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
`

const LegendSwatch = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 1px solid black;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    width: 1em;
    height: 1em;
    background: ${props => props.color};
    opacity: ${props => props.opacity};
  }
`

export const Legend = ({ datasets }) => (
  <LegendWrapper>
    {datasets.map(dataset => (
      <LegendItem key={dataset.name}>
        <LegendSwatch color={dataset.color} opacity={dataset.opacity} />
        {dataset.name}
      </LegendItem>
    ))}
  </LegendWrapper>
)

Legend.propTypes = {
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      opacity: PropTypes.number,
    })
  ).isRequired,
}
