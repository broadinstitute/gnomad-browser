import { test, expect } from '@jest/globals'
import { DatasetId, ReferenceGenome, referenceGenome } from './metadata'
import { forAllDatasets } from '../tests/__helpers__/datasets'

const expectedReferenceGenome: Record<DatasetId, ReferenceGenome> = {
  exac: 'GRCh37',
  gnomad_r2_1: 'GRCh37',
  gnomad_r2_1_controls: 'GRCh37',
  gnomad_r2_1_non_cancer: 'GRCh37',
  gnomad_r2_1_non_neuro: 'GRCh37',
  gnomad_r2_1_non_topmed: 'GRCh37',
  gnomad_r3: 'GRCh38',
  gnomad_r4: 'GRCh38',
  gnomad_r3_controls_and_biobanks: 'GRCh38',
  gnomad_r3_non_cancer: 'GRCh38',
  gnomad_r3_non_neuro: 'GRCh38',
  gnomad_r3_non_topmed: 'GRCh38',
  gnomad_r3_non_v2: 'GRCh38',
  gnomad_sv_r2_1: 'GRCh37',
  gnomad_sv_r2_1_controls: 'GRCh37',
  gnomad_sv_r2_1_non_neuro: 'GRCh37',
  gnomad_sv_r4: 'GRCh38',
  gnomad_cnv_r4: 'GRCh38',
  gnomad_r4_non_ukb: 'GRCh38',
}

forAllDatasets('referenceGenome(%s)', (datasetId) => {
  const expectedResult = expectedReferenceGenome[datasetId]
  test(`${datasetId} uses reference genome ${expectedResult}`, () =>
    expect(referenceGenome(datasetId)).toEqual(expectedResult))
})
