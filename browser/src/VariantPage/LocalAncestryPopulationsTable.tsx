import React from 'react'

import { Badge } from '@gnomad/ui'

import {
  GNOMAD_POPULATION_NAMES,
  LOCAL_ANCESTRY_NAMES,
  PopulationId,
} from '@gnomad/dataset-metadata/gnomadPopulations'

import { PopulationsTable } from './PopulationsTable'

import { LocalAncestryPopulation } from './VariantPage'

type PopulationWithLocalAncestryPopulations = {
  id: PopulationId
  ac: number
  an: number
  subpopulations: LocalAncestryPopulation[]
}

const addPopulationNames = (populations: PopulationWithLocalAncestryPopulations[]) => {
  return populations.map((pop) => ({
    ...pop,
    name: GNOMAD_POPULATION_NAMES[pop.id] || pop.id,

    subpopulations: pop.subpopulations.map((subPop) => ({
      ...subPop,
      name: (LOCAL_ANCESTRY_NAMES as Record<string, string>)[subPop.id.split('_')[1]] || subPop.id,
    })),
  }))
}

const groupPopulations = (
  populations: LocalAncestryPopulation[]
): PopulationWithLocalAncestryPopulations[] => {
  const populationsById: Partial<Record<PopulationId, PopulationWithLocalAncestryPopulations>> = {}

  populations.forEach((pop) => {
    const popId = pop.id.split('_')[0] as PopulationId

    if (!populationsById[popId]) {
      populationsById[popId] = {
        id: popId,
        ac: 0,
        an: 0,
        subpopulations: [],
      }
    }

    populationsById[popId]!.ac += pop.ac
    populationsById[popId]!.an += pop.an
    populationsById[popId]!.subpopulations.push(pop)
  })

  return Object.values(populationsById)
}

type LocalAncestryPopulationsTableProps = {
  populations: LocalAncestryPopulation[]
}

const LocalAncestryPopulationsTable = ({ populations }: LocalAncestryPopulationsTableProps) => {
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
        <Badge level="info">Note</Badge> Local ancestry is not available for all gnomAD genetic
        ancestry groups.
      </p>
    </div>
  )
}

export default LocalAncestryPopulationsTable
