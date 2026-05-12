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

  const populations = nestPopulations(addPopulationNames(mappedPopulations))

  return (
    <TableWrapper>
      <PopulationsTable
        populations={populations}
        showHomozygotes={true}
        showHemizygotes={false}
      />
    </TableWrapper>
  )
}

export default LongReadFrequenciesTable
