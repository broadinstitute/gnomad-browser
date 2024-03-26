import React from 'react'

import { CopyNumberVariant, CopyNumberVariantPopulation } from './CopyNumberVariantPage'
import { populationName } from '@gnomad/dataset-metadata/gnomadPopulations'
import { CNVPopulationsTable } from './CNVPopulationsTable'

type NamedCopyNumberVariantPopulation = CopyNumberVariantPopulation & {
  name: string
}

type SubancestryGroups = {
  [key: string]: NamedCopyNumberVariantPopulation[]
}

const nestPopulations = (ancestry_groups: NamedCopyNumberVariantPopulation[]) => {
  const popIndices = []
  const subancestry_groups: SubancestryGroups = {}

  for (let i = 0; i < ancestry_groups.length; i += 1) {
    const pop = ancestry_groups[i]

    const divisions = pop.id.split('_')
    if (divisions.length === 1) {
      popIndices.push(i)
    } else {
      const parentPop = divisions[0]
      if (subancestry_groups[parentPop] === undefined) {
        subancestry_groups[parentPop] = [{ ...pop }]
      } else {
        subancestry_groups[parentPop].push({ ...pop })
      }
    }
  }

  return popIndices.map((index) => {
    const pop = ancestry_groups[index]
    return {
      ...pop,
      subancestry_groups: subancestry_groups[pop.id],
    }
  })
}

const addPopulationNames = (ancestry_groups: CopyNumberVariantPopulation[] | null) => {
  return (ancestry_groups || []).map((pop: CopyNumberVariantPopulation) => {
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

type CopyNumberVariantPopulationsTableProps = {
  variant: CopyNumberVariant
}

const CopyNumberVariantPopulationsTable = ({ variant }: CopyNumberVariantPopulationsTableProps) => {
  const ancestry_groups = nestPopulations(addPopulationNames(variant.ancestry_groups))

  const columnLabels = {
    sc: 'Site Count',
    sn: 'Site Number',
    sf: 'Site Frequency',
  }

  return (
    <CNVPopulationsTable
      columnLabels={columnLabels}
      ancestry_groups={ancestry_groups}
      variant={variant}
    />
  )
}

export default CopyNumberVariantPopulationsTable
