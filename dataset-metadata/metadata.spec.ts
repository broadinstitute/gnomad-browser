import { isSubset } from './metadata'

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
])('isSubset(%s)', (datasetName, expectedResult) => {
  const verb = expectedResult ? 'is' : 'is not'
  test(`${datasetName} ${verb} a subset`, () =>
    expect(isSubset(datasetName)).toEqual(expectedResult))
})
