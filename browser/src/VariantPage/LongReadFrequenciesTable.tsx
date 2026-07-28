import React from 'react'

import TableWrapper from '../TableWrapper'
import { PopulationsTable } from './PopulationsTable'
import { addPopulationNames, nestPopulations } from './GnomadPopulationsTable'
import { LongReadSequencingType } from './VariantPage'

type Props = {
  longRead: LongReadSequencingType
}

const LongReadFrequenciesTable = ({ longRead }: Props) => {
  // Map LR populations to the shape expected by PopulationsTable
  const mappedPopulations = longRead.populations.map((pop) => ({
    id: pop.id,
    ac: pop.ac,
    an: pop.an,
    ac_hom: pop.homozygote_alt_count ?? 0,
  }))

  const namedPopulations = addPopulationNames(mappedPopulations)
  const populations = nestPopulations(namedPopulations)
  const groupMax = longRead.populations.reduce<(typeof longRead.populations)[number] | null>(
    (maxPopulation, population) =>
      maxPopulation === null || population.af > maxPopulation.af ? population : maxPopulation,
    null
  )
  const groupMaxName = groupMax
    ? namedPopulations.find((population) => population.id === groupMax.id)?.name || groupMax.id
    : null

  return (
    <>
      {groupMax && groupMaxName && (
        <p>
          <strong>Ancestry group maximum AF:</strong> {groupMax.af.toPrecision(4)} ({groupMaxName})
        </p>
      )}
      <TableWrapper>
        <PopulationsTable
          populations={populations}
          showHomozygotes={true}
          showHemizygotes={false}
        />
      </TableWrapper>
    </>
  )
}

export default LongReadFrequenciesTable
