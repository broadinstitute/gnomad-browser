import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const datasetConfig = {
  gnomadExome: { color: 'rgba(70, 130, 180, 0.8)', abbreviation: 'E' },
  gnomadExomeFiltered: { color: 'rgba(70, 130, 180, 0.4)', abbreviation: 'E' },
  gnomadGenome: { color: 'rgba(115, 171, 61, 1)', abbreviation: 'G' },
  gnomadGenomeFiltered: { color: 'rgba(115, 171, 61, 0.4)', abbreviation: 'G' },
  exac: { color: 'rgba(70, 130, 180, 1)', abbreviation: 'ExAC' },
  exacFiltered: { color: 'rgba(70, 130, 180, 0.6)', abbreviation: 'ExAC' },
}

const Icon = styled.span`
  padding: 1px 4px;
  border: 1px ${props => (props.isFiltered ? 'dashed' : 'solid')} #000;
  border-radius: 3px;
  margin-left: 10px;
  background-color: ${props => props.color};
  color: white;
`

const DatasetIcon = ({ dataset, isFiltered }) => {
  const { abbreviation, color } = isFiltered
    ? datasetConfig[`${dataset}Filtered`]
    : datasetConfig[dataset]

  return (
    <Icon color={color} isFiltered={isFiltered}>
      {abbreviation}
    </Icon>
  )
}

DatasetIcon.propTypes = {
  dataset: PropTypes.string.isRequired,
  isFiltered: PropTypes.bool.isRequired,
}

export default DatasetIcon
