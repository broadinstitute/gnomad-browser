import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const populationNames = {
  AFR: 'African/African-American',
  AMR: 'Latino',
  EAS: 'East Asian',
  EUR: 'European',
  OTH: 'Other',
}

const nestPopulations = populations => {
  const indices = populations.reduce((acc, pop, i) => ({ ...acc, [pop.id]: i }), {})

  const ancestryPopulations = ['AFR', 'AMR', 'EAS', 'EUR', 'OTH']
    .filter(popId => indices[popId] !== undefined)
    .map(popId => ({
      ...populations[indices[popId]],
      subpopulations: ['XX', 'XY']
        .filter(subPopId => indices[`${popId}_${subPopId}`] !== undefined)
        .map(subPopId => populations[indices[`${popId}_${subPopId}`]]),
    }))

  return [...ancestryPopulations, populations[indices.XX], populations[indices.XY]]
}

const addPopulationNames = populations => {
  return populations.map(pop => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      name = populationNames[pop.id] || pop.id
    }
    return { ...pop, name }
  })
}

const StructuralVariantPopulationsTable = ({ variant }) => {
  const populations = nestPopulations(
    // TODO: the data pipeline now stores population IDs with XX and XY instead of FEMALE and MALE
    // This ID mapping can be removed after reloading variants
    addPopulationNames(
      variant.populations.map(population => ({
        ...population,
        id: population.id.replace('FEMALE', 'XX').replace('MALE', 'XY'),
      }))
    )
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
