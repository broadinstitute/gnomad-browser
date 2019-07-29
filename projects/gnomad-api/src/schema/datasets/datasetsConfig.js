// import ExacVariantDetailsType from './exac/ExacVariantDetailsType'
import countExacVariantsInRegion from './exac/countExacVariantsInRegion'
// import fetchExacVariantDetails from './exac/fetchExacVariantDetails'
import fetchExacVariantsByGene from './exac/fetchExacVariantsByGene'
import fetchExacVariantsByRegion from './exac/fetchExacVariantsByRegion'
import fetchExacVariantsByTranscript from './exac/fetchExacVariantsByTranscript'

import Gnomad21VariantDetailsType from './gnomad_r2_1/GnomadVariantDetailsType'
import countGnomad21VariantsInRegion from './gnomad_r2_1/countGnomadVariantsInRegion'
import fetchGnomad21AggregateQualityMetrics from './gnomad_r2_1/fetchGnomadAggregateQualityMetrics'
import fetchGnomad21VariantDetails from './gnomad_r2_1/fetchGnomadVariantDetails'
import fetchGnomad21VariantsByGene from './gnomad_r2_1/fetchGnomadVariantsByGene'
import fetchGnomad21VariantsByRegion from './gnomad_r2_1/fetchGnomadVariantsByRegion'
import fetchGnomad21VariantsByTranscript from './gnomad_r2_1/fetchGnomadVariantsByTranscript'

const datasetsConfig = {
  exac: {
    countVariantsInRegion: countExacVariantsInRegion,
    // fetchVariantDetails: fetchExacVariantDetails,
    fetchVariantsByGene: fetchExacVariantsByGene,
    fetchVariantsByRegion: fetchExacVariantsByRegion,
    fetchVariantsByTranscript: fetchExacVariantsByTranscript,
    // variantDetailsType: ExacVariantDetailsType,
    exomeCoverageIndex: { index: 'exacv1_coverage', type: 'position' },
    genomeCoverageIndex: {},
  },
  gnomad_r2_1: {
    countVariantsInRegion: (...args) => countGnomad21VariantsInRegion(...args, 'gnomad'),
    fetchAggregateQualityMetrics: fetchGnomad21AggregateQualityMetrics,
    fetchVariantDetails: (...args) => fetchGnomad21VariantDetails(...args, 'gnomad'),
    fetchVariantsByGene: (...args) => fetchGnomad21VariantsByGene(...args, 'gnomad'),
    fetchVariantsByRegion: (...args) => fetchGnomad21VariantsByRegion(...args, 'gnomad'),
    fetchVariantsByTranscript: (...args) => fetchGnomad21VariantsByTranscript(...args, 'gnomad'),
    variantDetailsType: Gnomad21VariantDetailsType,
    exomeCoverageIndex: { index: 'gnomad_exome_coverage_2_1', type: 'variant' },
    genomeCoverageIndex: { index: 'gnomad_genome_coverage_2_1', type: 'variant' },
  },
}

const gnomadSubsets = ['controls', 'non_neuro', 'non_cancer', 'non_topmed']

gnomadSubsets.forEach(subset => {
  datasetsConfig[`gnomad_r2_1_${subset}`] = {
    countVariantsInRegion: (...args) => countGnomad21VariantsInRegion(...args, subset),
    fetchAggregateQualityMetrics: fetchGnomad21AggregateQualityMetrics,
    fetchVariantDetails: (...args) => fetchGnomad21VariantDetails(...args, subset),
    fetchVariantsByGene: (...args) => fetchGnomad21VariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args) => fetchGnomad21VariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args) => fetchGnomad21VariantsByTranscript(...args, subset),
  }
})

export default datasetsConfig

export const datasetSpecificTypes = [/*ExacVariantDetailsType,*/ Gnomad21VariantDetailsType]
