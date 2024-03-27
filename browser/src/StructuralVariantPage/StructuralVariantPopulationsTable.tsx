import React from 'react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import { StructuralVariant } from './StructuralVariantPage'
import { populationName } from '@gnomad/dataset-metadata/gnomadPopulations'

const nestPopulations = (ancestry_groups: any) => {
  const popIndices = []
  const subancestry_groups = {}

  for (let i = 0; i < ancestry_groups.length; i += 1) {
    const pop = ancestry_groups[i]

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
      if (subancestry_groups[parentPop] === undefined) {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subancestry_groups[parentPop] = [{ ...pop }]
      } else {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        subancestry_groups[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map((index) => {
    const pop = ancestry_groups[index]
    return {
      ...pop,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      subancestry_groups: subancestry_groups[pop.id],
    }
  })
}

const addPopulationNames = (ancestry_groups: any) => {
  return ancestry_groups.map((pop: any) => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      name = populationName(pop.id)
    }
    return { ...pop, name }
  })
}

type StructuralVariantPopulationsTableProps = {
  variant: StructuralVariant
}

const StructuralVariantPopulationsTable = ({ variant }: StructuralVariantPopulationsTableProps) => {
  const ancestry_groups = nestPopulations(addPopulationNames(variant.ancestry_groups))

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
      populations={ancestry_groups}
      showHomozygotes={variant.type !== 'MCNV' && variant.chrom !== 'Y'}
      showHemizygotes={variant.type !== 'MCNV' && (variant.chrom === 'X' || variant.chrom === 'Y')}
    />
  )
}

export default StructuralVariantPopulationsTable
