const exacSampleCounts = require('./datasets/exac/sampleCounts')
const {
  subsets: gnomadV2SubsetSampleCounts,
  ...gnomadV2SampleCounts
} = require('./datasets/gnomad-v2/sampleCounts')
const {
  subsets: gnomadV3SubsetSampleCounts,
  ...gnomadV3SampleCounts
} = require('./datasets/gnomad-v3/sampleCounts')
const {
  subsets: gnomadSvV2SubsetSampleCounts,
  ...gnomadSvV2SampleCounts
} = require('./datasets/gnomad-sv-v2/sampleCounts')

const sampleCounts = [
  { exac: exacSampleCounts },
  { gnomad_r2_1: gnomadV2SampleCounts },
  ...Object.keys(gnomadV2SubsetSampleCounts).map((subset) => ({
    [`gnomad_r2_1_${subset}`]: gnomadV2SubsetSampleCounts[subset],
  })),
  { gnomad_r3: gnomadV3SampleCounts },
  ...Object.keys(gnomadV3SubsetSampleCounts).map((subset) => ({
    [`gnomad_r3_${subset}`]: gnomadV3SubsetSampleCounts[subset],
  })),
  { gnomad_sv_r2_1: gnomadSvV2SampleCounts },
  ...Object.keys(gnomadSvV2SubsetSampleCounts).map((subset) => ({
    [`gnomad_sv_r2_1_${subset}`]: gnomadSvV2SubsetSampleCounts[subset],
  })),
  { gnomad_sv_r3: { total: 63046 } },
].reduce(Object.assign, {})

export default sampleCounts
