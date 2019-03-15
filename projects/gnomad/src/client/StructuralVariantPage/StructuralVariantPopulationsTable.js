import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const populationNames = {
  AFR: 'African',
  AMR: 'Latino',
  EAS: 'East Asian',
  EUR: 'European',
  OTH: 'Other',
}

const StructuralVariantPopulationsTable = ({ variant }) => {
  const populations = variant.populations.map(population => ({
    ...population,
    name: populationNames[population.id],
    ac_hemi: 0,
  }))

  const columnLabels =
    variant.type === 'MCNV'
      ? {
          ac: 'Non-diploid Samples',
          an: 'Total Samples',
          af: 'Non-diploid CN Frequency',
        }
      : undefined

  return (
    <PopulationsTable
      columnLabels={columnLabels}
      populations={populations}
      showHomozygotes={variant.type !== 'MCNV' && variant.chrom !== 'Y'}
      showHemizygotes={false}
    />
  )
}

StructuralVariantPopulationsTable.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantPopulationsTable
