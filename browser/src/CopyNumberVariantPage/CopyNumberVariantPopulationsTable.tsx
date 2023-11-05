import React from 'react'

import { CopyNumberVariant } from './CopyNumberVariantPage'
import { populationName } from '@gnomad/dataset-metadata/gnomadPopulations'
import { CNVPopulationsTable } from './CNVPopulationsTable'

type CopyNumberVariantPopulation = {
  id: string
  sc: number
  sn: number
  sf: number
  name: string
}

type Subpopulations = {
  [key: string]: CopyNumberVariantPopulation[]
}

const nestPopulations = (populations: CopyNumberVariantPopulation[]) => {
  const popIndices = []
  const subpopulations: Subpopulations = {}

  for (let i = 0; i < populations.length; i += 1) {
    const pop = populations[i]

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

  return popIndices.map((index) => {
    const pop = populations[index]
    return {
      ...pop,
      subpopulations: subpopulations[pop.id],
    }
  })
}

const addPopulationNames = (populations: CopyNumberVariantPopulation[]) => {
  return populations.map((pop: CopyNumberVariantPopulation) => {
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
  const populations = nestPopulations(addPopulationNames((variant as any).populations))

  const columnLabels = {
    sc: 'Site Count',
    sn: 'Site Number',
    sf: 'Site Frequency',
  }

  return <CNVPopulationsTable columnLabels={columnLabels} populations={populations} variant={variant} />
}

export default CopyNumberVariantPopulationsTable
