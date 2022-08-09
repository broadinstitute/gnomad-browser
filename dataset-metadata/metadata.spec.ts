import { describe, test, expect } from '@jest/globals'
import { isSubset, labelForDataset } from './metadata'

describe.each([
  ['exac', false],
  ['gnomad_r2_1', false],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', true],
  ['gnomad_r3_non_cancer', true],
  ['gnomad_r3_non_neuro', true],
  ['gnomad_r3_non_topmed', true],
  ['gnomad_r3_non_v2', true],
  ['gnomad_sv_r2_1', false],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
])('isSubset(%s)', (datasetId, expectedResult) => {
  const verb = expectedResult ? 'is' : 'is not'
  test(`${datasetId} ${verb} a subset`, () => expect(isSubset(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', 'ExAC v1.0'],
  ['gnomad_r2_1', 'gnomAD v2.1.1'],
  ['gnomad_r2_1_controls', 'gnomAD v2.1.1 (controls)'],
  ['gnomad_r2_1_non_cancer', 'gnomAD v2.1.1 (non-cancer)'],
  ['gnomad_r2_1_non_neuro', 'gnomAD v2.1.1 (non-neuro)'],
  ['gnomad_r2_1_non_topmed', 'gnomAD v2.1.1 (non-TOPMed)'],
  ['gnomad_r3', 'gnomAD v3.1.2'],
  ['gnomad_r3_controls_and_biobanks', 'gnomAD v3.1.2 (controls/biobanks)'],
  ['gnomad_r3_non_cancer', 'gnomAD v3.1.2 (non-cancer)'],
  ['gnomad_r3_non_neuro', 'gnomAD v3.1.2 (non-neuro)'],
  ['gnomad_r3_non_topmed', 'gnomAD v3.1.2 (non-TOPMed)'],
  ['gnomad_r3_non_v2', 'gnomAD v3.1.2 (non-v2)'],
  ['gnomad_sv_r2_1', 'gnomAD SVs v2.1'],
  ['gnomad_sv_r2_1_controls', 'gnomAD SVs v2.1 (controls)'],
  ['gnomad_sv_r2_1_non_neuro', 'gnomAD SVs v2.1 (non-neuro)'],
])('labelForDataset(%s)', (datasetId, expectedResult) => {
  test(`Label for ${datasetId} is "${expectedResult}"`, () =>
    expect(labelForDataset(datasetId)).toEqual(expectedResult))
})
