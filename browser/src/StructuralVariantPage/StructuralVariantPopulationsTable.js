import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const populationNames = {
  afr: 'African/African-American',
  amr: 'Latino',
  eas: 'East Asian',
  eur: 'European',
  oth: 'Other',
}

const nestPopulations = populations => {
  const popIndices = []
  const subpopulations = {}

  for (let i = 0; i < populations.length; i += 1) {
    const pop = populations[i]

    // IDs are one of:
    // * pop
    // * pop_subpop
    // * pop_sex
    // * sex
    const divisions = pop.id.split('_')
    if (divisions.length === 1) {
      popIndices.push(i)
    } else {
      const parentPop = divisions[0]
      if (subpopulations[parentPop] === undefined) {
        subpopulations[parentPop] = [{ ...pop }]
      } else {
        subpopulations[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map(index => {
    const pop = populations[index]
    return {
      ...pop,
      subpopulations: subpopulations[pop.id],
    }
  })
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
  const populations = nestPopulations(addPopulationNames(variant.populations))

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
