import countExacVariantsInRegion from './exac/countExacVariantsInRegion'
// import fetchExacVariantDetails from './exac/fetchExacVariantDetails'
import fetchExacVariantsByGene from './exac/fetchExacVariantsByGene'
import fetchExacVariantsByRegion from './exac/fetchExacVariantsByRegion'
import fetchExacVariantsByTranscript from './exac/fetchExacVariantsByTranscript'

import countGnomad21VariantsInRegion from './gnomad_r2_1/countGnomadVariantsInRegion'
import fetchGnomad21VariantDetails from './gnomad_r2_1/fetchGnomadVariantDetails'
import fetchGnomad21VariantsByGene from './gnomad_r2_1/fetchGnomadVariantsByGene'
import fetchGnomad21VariantsByRegion from './gnomad_r2_1/fetchGnomadVariantsByRegion'
import fetchGnomad21VariantsByTranscript from './gnomad_r2_1/fetchGnomadVariantsByTranscript'

import countGnomadV3VariantsInRegion from './gnomad_r3/countGnomadV3VariantsInRegion'
import fetchGnomadV3VariantDetails from './gnomad_r3/fetchGnomadV3VariantDetails'
import fetchGnomadV3VariantsByGene from './gnomad_r3/fetchGnomadV3VariantsByGene'
import fetchGnomadV3VariantsByRegion from './gnomad_r3/fetchGnomadV3VariantsByRegion'
import fetchGnomadV3VariantsByTranscript from './gnomad_r3/fetchGnomadV3VariantsByTranscript'

const datasetsConfig = {
  exac: {
    label: 'ExAC',
    referenceGenome: 'GRCh37',
    countVariantsInRegion: countExacVariantsInRegion,
    // fetchVariantDetails: fetchExacVariantDetails,
    fetchVariantsByGene: fetchExacVariantsByGene,
    fetchVariantsByRegion: fetchExacVariantsByRegion,
    fetchVariantsByTranscript: fetchExacVariantsByTranscript,
    exomeCoverageIndex: { index: 'exacv1_coverage', type: 'position' },
    genomeCoverageIndex: {},
  },
  gnomad_r2_1: {
    label: 'gnomAD v2.1.1',
    referenceGenome: 'GRCh37',
    countVariantsInRegion: (...args) => countGnomad21VariantsInRegion(...args, 'gnomad'),
    fetchVariantDetails: (...args) => fetchGnomad21VariantDetails(...args, 'gnomad'),
    fetchVariantsByGene: (...args) => fetchGnomad21VariantsByGene(...args, 'gnomad'),
    fetchVariantsByRegion: (...args) => fetchGnomad21VariantsByRegion(...args, 'gnomad'),
    fetchVariantsByTranscript: (...args) => fetchGnomad21VariantsByTranscript(...args, 'gnomad'),
    exomeCoverageIndex: { index: 'gnomad_exome_coverage_2_1', type: 'variant' },
    genomeCoverageIndex: { index: 'gnomad_genome_coverage_2_1', type: 'variant' },
  },
  gnomad_r3: {
    label: 'gnomAD v3',
    referenceGenome: 'GRCh38',
    countVariantsInRegion: countGnomadV3VariantsInRegion,
    fetchVariantDetails: fetchGnomadV3VariantDetails,
    fetchVariantsByGene: fetchGnomadV3VariantsByGene,
    fetchVariantsByRegion: fetchGnomadV3VariantsByRegion,
    fetchVariantsByTranscript: fetchGnomadV3VariantsByTranscript,
    exomeCoverageIndex: undefined,
    genomeCoverageIndex: { index: 'gnomad_r3_coverage', type: 'documents' },
  },
}

const gnomadSubsets = ['controls', 'non_neuro', 'non_cancer', 'non_topmed']

gnomadSubsets.forEach(subset => {
  datasetsConfig[`gnomad_r2_1_${subset}`] = {
    referenceGenome: 'GRCh37',
    countVariantsInRegion: (...args) => countGnomad21VariantsInRegion(...args, subset),
    fetchVariantDetails: (...args) => fetchGnomad21VariantDetails(...args, subset),
    fetchVariantsByGene: (...args) => fetchGnomad21VariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args) => fetchGnomad21VariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args) => fetchGnomad21VariantsByTranscript(...args, subset),
  }
})

datasetsConfig.gnomad_r2_1_controls.label = 'gnomAD v2.1.1 (controls)'
datasetsConfig.gnomad_r2_1_non_neuro.label = 'gnomAD v2.1.1 (non-neuro)'
datasetsConfig.gnomad_r2_1_non_cancer.label = 'gnomAD v2.1.1 (non-cancer)'
datasetsConfig.gnomad_r2_1_non_topmed.label = 'gnomAD v2.1.1 (non-TOPMed)'

export default datasetsConfig
