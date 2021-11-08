import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { PopulationsTable } from './PopulationsTable'

const LOCAL_ANCESTRY_NAMES = {
  african: 'African',
  amerindigenous: 'Amerindigenous',
  european: 'European',
}

const addPopulationNames = populations => {
  return populations.map(pop => ({
    ...pop,
    name: GNOMAD_POPULATION_NAMES[pop.id] || pop.id,
    subpopulations: pop.subpopulations.map(subPop => ({
      ...subPop,
      name: LOCAL_ANCESTRY_NAMES[subPop.id.split('_')[1]] || subPop.id,
    })),
  }))
}

const groupPopulations = populations => {
  const populationsById = {}

  populations.forEach(pop => {
    const popId = pop.id.split('_')[0]

    if (!populationsById[popId]) {
      populationsById[popId] = {
        id: popId,
        ac: 0,
        an: 0,
        subpopulations: [],
      }
    }

    populationsById[popId].ac += pop.ac
    populationsById[popId].an += pop.an
    populationsById[popId].subpopulations.push(pop)
  })

  return Object.values(populationsById)
}

const LocalAncestryPopulationsTable = ({ populations }) => {
  const renderedPopulations = addPopulationNames(groupPopulations(populations))

  return (
    <div>
      <PopulationsTable
        populations={renderedPopulations}
        initiallyExpandRows
        showHemizygotes={false}
        showHomozygotes={false}
      />
      <p>
        <Badge level="info">Note</Badge> Local ancestry is not available for all gnomAD populations.
      </p>
    </div>
  )
}

LocalAncestryPopulationsTable.propTypes = {
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
    })
  ).isRequired,
}

export default LocalAncestryPopulationsTable
