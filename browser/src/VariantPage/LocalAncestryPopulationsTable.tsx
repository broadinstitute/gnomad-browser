import React from 'react'

import { Badge } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { PopulationsTable } from './PopulationsTable'

const LOCAL_ANCESTRY_NAMES = {
  african: 'African',
  amerindigenous: 'Amerindigenous',
  european: 'European',
}

const addPopulationNames = (populations: any) => {
  return populations.map((pop: any) => ({
    ...pop,
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    name: GNOMAD_POPULATION_NAMES[pop.id] || pop.id,

    subpopulations: pop.subpopulations.map((subPop: any) => ({
      ...subPop,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      name: LOCAL_ANCESTRY_NAMES[subPop.id.split('_')[1]] || subPop.id,
    })),
  }))
}

const groupPopulations = (populations: any) => {
  const populationsById = {}

  populations.forEach((pop: any) => {
    const popId = pop.id.split('_')[0]

    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    if (!populationsById[popId]) {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      populationsById[popId] = {
        id: popId,
        ac: 0,
        an: 0,
        subpopulations: [],
      }
    }

    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    populationsById[popId].ac += pop.ac
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    populationsById[popId].an += pop.an
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    populationsById[popId].subpopulations.push(pop)
  })

  return Object.values(populationsById)
}

type LocalAncestryPopulationsTableProps = {
  populations: {
    id: string
    ac: number
    an: number
  }[]
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
        <Badge level="info">Note</Badge> Local ancestry is not available for all gnomAD populations.
      </p>
    </div>
  )
}

export default LocalAncestryPopulationsTable
