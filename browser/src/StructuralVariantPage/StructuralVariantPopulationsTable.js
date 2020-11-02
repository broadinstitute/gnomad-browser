import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const populationNames = {
  AFR: 'African',
  AMR: 'Latino',
  EAS: 'East Asian',
  EUR: 'European',
  OTH: 'Other',

  FEMALE: 'Female',
  MALE: 'Male',
}

const nestPopulations = populations => {
  const indices = populations.reduce((acc, pop, i) => ({ ...acc, [pop.id]: i }), {})

  const ancestryPopulations = ['AFR', 'AMR', 'EAS', 'EUR', 'OTH']
    .filter(popId => indices[popId] !== undefined)
    .map(popId => ({
      ...populations[indices[popId]],
      subpopulations: ['FEMALE', 'MALE']
        .filter(subPopId => indices[`${popId}_${subPopId}`] !== undefined)
        .map(subPopId => populations[indices[`${popId}_${subPopId}`]]),
    }))

  return [...ancestryPopulations, populations[indices.FEMALE], populations[indices.MALE]]
}

const StructuralVariantPopulationsTable = ({ variant }) => {
  const populations = nestPopulations(
    variant.populations.map(population => ({
      ...population,
      name: population.id.includes('_')
        ? populationNames[population.id.split('_')[1]]
        : populationNames[population.id],
    }))
  )

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
      showHemizygotes={variant.type !== 'MCNV' && (variant.chrom === 'X' || variant.chrom === 'Y')}
    />
  )
}

StructuralVariantPopulationsTable.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantPopulationsTable
