import { test, expect } from '@jest/globals'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { createPopulationColumns, createVersionSpecificColumns } from './ExportVariantsButton'
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

forAllDatasets('ExportVariantsButton with "%s" selected', (datasetId) => {
  test('returns the expected genetic ancestry group columns', () => {
    const expectedPopulations = getDatasetPopulations(datasetId)
    const result = createPopulationColumns(datasetId)

    expect(getAllPopulationColumns(result)).toStrictEqual(
      createExpectedPopulationColumns(expectedPopulations)
    )
  })
})

const JOINT_FILTERS_LABEL = 'Filters - joint'
const JOINT_GROUPMAX_GROUP_LABEL = 'GroupMax FAF group'
const JOINT_GROUPMAX_FREQ_LABEL = 'GroupMax FAF frequency'
const CADD_LABEL = 'cadd'
const REVEL_MAX_LABEL = 'revel_max'
const SPLICEAI_DS_MAX_LABEL = 'spliceai_ds_max'
const PANGOLIN_LARGEST_DS_LABEL = 'pangolin_largest_ds'
const PHYLOP_LABEL = 'phylop'
const SIFT_MAX_LABEL = 'sift_max'
const POLYPHEN_MAX_LABEL = 'polyphen_max'
const EXOME_GROUPMAX_GROUP_LABEL = 'Exome GroupMax FAF group'
const EXOME_GROUPMAX_FREQ_LABEL = 'Exome GroupMax FAF frequency'
const GENOME_GROUPMAX_GROUP_LABEL = 'Genome GroupMax FAF group'
const GENOME_GROUPMAX_FREQ_LABEL = 'Genome GroupMax FAF frequency'

const expectedVersionSpecificColumns: Record<DatasetId, string[]> = {
  exac: [],
  gnomad_r2_1: [
    EXOME_GROUPMAX_GROUP_LABEL,
    EXOME_GROUPMAX_FREQ_LABEL,
    GENOME_GROUPMAX_GROUP_LABEL,
    GENOME_GROUPMAX_FREQ_LABEL,
  ],
  gnomad_r2_1_controls: [
    EXOME_GROUPMAX_GROUP_LABEL,
    EXOME_GROUPMAX_FREQ_LABEL,
    GENOME_GROUPMAX_GROUP_LABEL,
    GENOME_GROUPMAX_FREQ_LABEL,
  ],
  gnomad_r2_1_non_cancer: [
    EXOME_GROUPMAX_GROUP_LABEL,
    EXOME_GROUPMAX_FREQ_LABEL,
    GENOME_GROUPMAX_GROUP_LABEL,
    GENOME_GROUPMAX_FREQ_LABEL,
  ],
  gnomad_r2_1_non_neuro: [
    EXOME_GROUPMAX_GROUP_LABEL,
    EXOME_GROUPMAX_FREQ_LABEL,
    GENOME_GROUPMAX_GROUP_LABEL,
    GENOME_GROUPMAX_FREQ_LABEL,
  ],
  gnomad_r2_1_non_topmed: [
    EXOME_GROUPMAX_GROUP_LABEL,
    EXOME_GROUPMAX_FREQ_LABEL,
    GENOME_GROUPMAX_GROUP_LABEL,
    GENOME_GROUPMAX_FREQ_LABEL,
  ],
  gnomad_r3: [],
  gnomad_r3_controls_and_biobanks: [],
  gnomad_r3_non_cancer: [],
  gnomad_r3_non_neuro: [],
  gnomad_r3_non_topmed: [],
  gnomad_r3_non_v2: [],
  gnomad_sv_r2_1: [],
  gnomad_sv_r2_1_controls: [],
  gnomad_sv_r2_1_non_neuro: [],
  gnomad_sv_r4: [
    JOINT_FILTERS_LABEL,
    JOINT_GROUPMAX_GROUP_LABEL,
    JOINT_GROUPMAX_FREQ_LABEL,
    CADD_LABEL,
    REVEL_MAX_LABEL,
    SPLICEAI_DS_MAX_LABEL,
    PANGOLIN_LARGEST_DS_LABEL,
    PHYLOP_LABEL,
    SIFT_MAX_LABEL,
    POLYPHEN_MAX_LABEL,
  ],
  gnomad_cnv_r4: [
    JOINT_FILTERS_LABEL,
    JOINT_GROUPMAX_GROUP_LABEL,
    JOINT_GROUPMAX_FREQ_LABEL,
    CADD_LABEL,
    REVEL_MAX_LABEL,
    SPLICEAI_DS_MAX_LABEL,
    PANGOLIN_LARGEST_DS_LABEL,
    PHYLOP_LABEL,
    SIFT_MAX_LABEL,
    POLYPHEN_MAX_LABEL,
  ],
  gnomad_r4: [
    JOINT_FILTERS_LABEL,
    JOINT_GROUPMAX_GROUP_LABEL,
    JOINT_GROUPMAX_FREQ_LABEL,
    CADD_LABEL,
    REVEL_MAX_LABEL,
    SPLICEAI_DS_MAX_LABEL,
    PANGOLIN_LARGEST_DS_LABEL,
    PHYLOP_LABEL,
    SIFT_MAX_LABEL,
    POLYPHEN_MAX_LABEL,
  ],
  gnomad_r4_non_ukb: [
    JOINT_FILTERS_LABEL,
    JOINT_GROUPMAX_GROUP_LABEL,
    JOINT_GROUPMAX_FREQ_LABEL,
    CADD_LABEL,
    REVEL_MAX_LABEL,
    SPLICEAI_DS_MAX_LABEL,
    PANGOLIN_LARGEST_DS_LABEL,
    PHYLOP_LABEL,
    SIFT_MAX_LABEL,
    POLYPHEN_MAX_LABEL,
  ],
}

forAllDatasets('createVersionSpecificColumns for %s dataset', (datasetId) => {
  const columnLabels = expectedVersionSpecificColumns[datasetId]
  test(`returns the columns ${columnLabels.join(', ')}`, () => {
    expect(createVersionSpecificColumns(datasetId).map((column) => column.label)).toEqual(
      columnLabels
    )
  })
})
