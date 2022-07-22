import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const populationNames = {
  afr: 'African/African American',
  amr: 'Latino',
  eas: 'East Asian',
  eur: 'European',
  oth: 'Other',
}

const nestPopulations = (populations: any) => {
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
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (subpopulations[parentPop] === undefined) {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subpopulations[parentPop] = [{ ...pop }]
      } else {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subpopulations[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map((index) => {
    const pop = populations[index]
    return {
      ...pop,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      subpopulations: subpopulations[pop.id],
    }
  })
}

const addPopulationNames = (populations: any) => {
  return populations.map((pop: any) => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      name = populationNames[pop.id] || pop.id
    }
    return { ...pop, name }
  })
}

type StructuralVariantPopulationsTableProps = {
  variant: StructuralVariantDetailPropType
}

const StructuralVariantPopulationsTable = ({ variant }: StructuralVariantPopulationsTableProps) => {
  const populations = nestPopulations(addPopulationNames((variant as any).populations))

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

export default StructuralVariantPopulationsTable
