import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from '@gnomad/ui'

const Icon = styled.span`
  padding: 1px 4px;
  border: 1px ${props => (props.isFiltered ? 'dashed' : 'solid')} #000;
  border-radius: 3px;
  margin-left: 10px;
  background-color: ${props =>
    props.isFiltered ? transparentize(0.5, props.color, props.color) : props.color};
  color: white;
`

const abbreviations = {
  exome: 'E',
  genome: 'G',
}

const colors = {
  exome: 'rgb(70, 130, 180)',
  genome: 'rgb(115, 171, 61)',
}

const SampleSourceIcon = ({ source, filters }) => {
  const isFiltered = filters.length > 0

  let tooltip = `This variant is found in ${source} samples`
  if (isFiltered) {
    tooltip += `, where it failed the following filters: ${filters.join(', ')}`
  }

  return (
    <TooltipAnchor tooltip={tooltip}>
      <Icon color={colors[source]} isFiltered={isFiltered}>
        {abbreviations[source]}
      </Icon>
    </TooltipAnchor>
  )
}

SampleSourceIcon.propTypes = {
  source: PropTypes.oneOf(['exome', 'genome']).isRequired,
  filters: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default SampleSourceIcon
