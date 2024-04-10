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
const gnomadCnvV4SubsetSampleCounts = require('./datasets/gnomad-cnv-v4/sampleCounts')

const {
  subsets: gnomadV4SubsetSampleCounts,
  ...gnomadV4SampleCounts
} = require('./datasets/gnomad-v4/sampleCounts')

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
  { gnomad_sv_r4: { total: 63046 } },
  { gnomad_cnv_r4: gnomadCnvV4SubsetSampleCounts }, // TODO: should not be called "subset"
  { gnomad_r4: gnomadV4SampleCounts },
  ...Object.keys(gnomadV4SubsetSampleCounts).map((subset) => ({
    [`gnomad_r4_${subset}`]: gnomadV4SubsetSampleCounts[subset],
  })),
].reduce(Object.assign, {})

export default sampleCounts
