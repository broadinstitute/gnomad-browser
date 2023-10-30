import { describe, test, expect } from '@jest/globals'
import {
  DatasetId,
  hasConstraints,
  genesHaveExomeCoverage,
  transcriptsHaveExomeCoverage,
  hasShortVariants,
  hasStructuralVariants,
  isSubset,
  labelForDataset,
  ReferenceGenome,
  referenceGenome,
  coverageDatasetId,
  allDatasetIds,
} from './metadata'

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
] as [DatasetId, boolean][])('isSubset(%s)', (datasetId, expectedResult) => {
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
] as [DatasetId, string][])('labelForDataset(%s)', (datasetId, expectedResult) => {
  test(`Label for ${datasetId} is "${expectedResult}"`, () =>
    expect(labelForDataset(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', true],
  ['gnomad_r3_controls_and_biobanks', true],
  ['gnomad_r3_non_cancer', true],
  ['gnomad_r3_non_neuro', true],
  ['gnomad_r3_non_topmed', true],
  ['gnomad_r3_non_v2', true],
  ['gnomad_sv_r2_1', false],
  ['gnomad_sv_r2_1_controls', false],
  ['gnomad_sv_r2_1_non_neuro', false],
] as [DatasetId, boolean][])('hasShortVariants(%s)', (datasetId, expectedResult) => {
  const verbPhrase = expectedResult ? 'has' : 'does not have'
  test(`${datasetId} ${verbPhrase} short variants`, () =>
    expect(hasShortVariants(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', false],
  ['gnomad_r2_1', false],
  ['gnomad_r2_1_controls', false],
  ['gnomad_r2_1_non_cancer', false],
  ['gnomad_r2_1_non_neuro', false],
  ['gnomad_r2_1_non_topmed', false],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
  ['gnomad_sv_r2_1', true],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
] as [DatasetId, boolean][])('hasStructuralVariants(%s)', (datasetId, expectedResult) => {
  const verbPhrase = expectedResult ? 'has' : 'does not have'
  test(`${datasetId} ${verbPhrase} structural variants`, () =>
    expect(hasStructuralVariants(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
  ['gnomad_sv_r2_1', true],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
] as [DatasetId, boolean][])('hasConstraints(%s)', (datasetId, expectedResult) => {
  const verbPhrase = expectedResult ? 'has' : 'does not have'
  test(`${datasetId} ${verbPhrase} constraints`, () =>
    expect(hasConstraints(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', 'GRCh37'],
  ['gnomad_r2_1', 'GRCh37'],
  ['gnomad_r2_1_controls', 'GRCh37'],
  ['gnomad_r2_1_non_cancer', 'GRCh37'],
  ['gnomad_r2_1_non_neuro', 'GRCh37'],
  ['gnomad_r2_1_non_topmed', 'GRCh37'],
  ['gnomad_r3', 'GRCh38'],
  ['gnomad_r3_controls_and_biobanks', 'GRCh38'],
  ['gnomad_r3_non_cancer', 'GRCh38'],
  ['gnomad_r3_non_neuro', 'GRCh38'],
  ['gnomad_r3_non_topmed', 'GRCh38'],
  ['gnomad_r3_non_v2', 'GRCh38'],
  ['gnomad_sv_r2_1', 'GRCh37'],
  ['gnomad_sv_r2_1_controls', 'GRCh37'],
  ['gnomad_sv_r2_1_non_neuro', 'GRCh37'],
] as [DatasetId, ReferenceGenome][])('referenceGenome(%s)', (datasetId, expectedResult) => {
  test(`${datasetId} uses reference genome ${expectedResult}`, () =>
    expect(referenceGenome(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
  ['gnomad_sv_r2_1', true],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
] as [DatasetId, boolean][])('genesHaveExomeCoverage(%s)', (datasetId, expectedResult) => {
  const verbPhrase = expectedResult ? 'has' : 'does not have'
  test(`${datasetId} ${verbPhrase} exome coverage`, () =>
    expect(genesHaveExomeCoverage(datasetId)).toEqual(expectedResult))
})

describe.each([
  ['exac', true],
  ['gnomad_r2_1', true],
  ['gnomad_r2_1_controls', true],
  ['gnomad_r2_1_non_cancer', true],
  ['gnomad_r2_1_non_neuro', true],
  ['gnomad_r2_1_non_topmed', true],
  ['gnomad_r3', false],
  ['gnomad_r3_controls_and_biobanks', false],
  ['gnomad_r3_non_cancer', false],
  ['gnomad_r3_non_neuro', false],
  ['gnomad_r3_non_topmed', false],
  ['gnomad_r3_non_v2', false],
  ['gnomad_sv_r2_1', true],
  ['gnomad_sv_r2_1_controls', true],
  ['gnomad_sv_r2_1_non_neuro', true],
] as [DatasetId, boolean][])('transcriptsHaveExomeCoverage(%s)', (datasetId, expectedResult) => {
  const verbPhrase = expectedResult ? 'has' : 'does not have'
  test(`${datasetId} ${verbPhrase} exome coverage`, () =>
    expect(transcriptsHaveExomeCoverage(datasetId)).toEqual(expectedResult))
})

const expectedCoverageDatasetIds: Record<DatasetId, DatasetId> = {
  exac: 'exac',
  gnomad_r2_1: 'gnomad_r2_1',
  gnomad_r2_1_controls: 'gnomad_r2_1',
  gnomad_r2_1_non_cancer: 'gnomad_r2_1',
  gnomad_r2_1_non_neuro: 'gnomad_r2_1',
  gnomad_r2_1_non_topmed: 'gnomad_r2_1',
  gnomad_r3: 'gnomad_r3',
  gnomad_r3_controls_and_biobanks: 'gnomad_r3',
  gnomad_r3_non_cancer: 'gnomad_r3',
  gnomad_r3_non_neuro: 'gnomad_r3',
  gnomad_r3_non_topmed: 'gnomad_r3',
  gnomad_r3_non_v2: 'gnomad_r3',
  gnomad_sv_r2_1: 'gnomad_r2_1',
  gnomad_sv_r2_1_controls: 'gnomad_r2_1',
  gnomad_sv_r2_1_non_neuro: 'gnomad_r2_1',
  gnomad_sv_r4: 'gnomad_r3',
  gnomad_r4: 'gnomad_r4',
  gnomad_cnv_r4: 'gnomad_r4'
}

describe.each(allDatasetIds)('coverageDataset for dataset %s', (datasetId: DatasetId) => {
  const expectedCoverageDatasetId = expectedCoverageDatasetIds[datasetId]
  test(`is ${expectedCoverageDatasetId}`, () =>
    expect(coverageDatasetId(datasetId)).toEqual(expectedCoverageDatasetId))
})
