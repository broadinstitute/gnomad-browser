import { test, expect } from '@jest/globals'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { createPopulationColumns } from './ExportVariantsButton'
import {
  GNOMAD_POPULATION_NAMES,
  PopulationId,
  populationsInDataset,
} from '@gnomad/dataset-metadata/gnomadPopulations'
import { DatasetId, isV4, isV3, isV2, isExac } from '@gnomad/dataset-metadata/metadata'

const getAllPopulationColumns = (columns: { label: string }[]) => {
  let populationColumns: string[] = []
  columns.forEach((column) => {
    populationColumns = populationColumns.concat(column.label)
  })
  return populationColumns
}

const getDatasetPopulations = (datasetId: DatasetId) => {
  /* eslint-disable no-nested-ternary */
  const topLevelDataset = isV4(datasetId)
    ? 'v4'
    : isV3(datasetId)
    ? 'v3'
    : isV2(datasetId)
    ? 'v2'
    : isExac(datasetId)
    ? 'ExAC'
    : 'default'
  /* eslint-enable no-nested-ternary */

  const datasetPopulations: PopulationId[] = populationsInDataset[topLevelDataset]

  return datasetPopulations
}

const createExpectedPopulationColumns = (populations: PopulationId[]) => {
  const columnCategories: string[] = [
    'Allele Count',
    'Allele Number',
    'Homozygote Count',
    'Hemizygote Count',
  ]

  let populationColumns: string[] = []
  populations.forEach((population) => {
    columnCategories.forEach((category) => {
      populationColumns = populationColumns.concat(
        `${category} ${GNOMAD_POPULATION_NAMES[population]}`
      )
    })
  })

  return populationColumns
}

forAllDatasets('DatasetSelector with "%s" selected', (datasetId) => {
  test('returns the expected genetic ancestry group columns', () => {
    const expectedPopulations = getDatasetPopulations(datasetId)
    const result = createPopulationColumns(datasetId)

    expect(getAllPopulationColumns(result)).toStrictEqual(
      createExpectedPopulationColumns(expectedPopulations)
    )
  })
})
