import ExacVariantDetailsType from './exac/ExacVariantDetailsType'
import countExacVariantsInRegion from './exac/countExacVariantsInRegion'
import fetchExacVariantDetails from './exac/fetchExacVariantDetails'
import fetchExacVariantsByGene from './exac/fetchExacVariantsByGene'
import fetchExacVariantsByRegion from './exac/fetchExacVariantsByRegion'
import fetchExacVariantsByTranscript from './exac/fetchExacVariantsByTranscript'

import GnomadVariantDetailsType from './gnomad/GnomadVariantDetailsType'
import fetchGnomadVariantDetails from './gnomad/fetchGnomadVariantDetails'

const datasetsConfig = {
  exac: {
    countVariantsInRegion: countExacVariantsInRegion,
    fetchVariantDetails: fetchExacVariantDetails,
    fetchVariantsByGene: fetchExacVariantsByGene,
    fetchVariantsByRegion: fetchExacVariantsByRegion,
    fetchVariantsByTranscript: fetchExacVariantsByTranscript,
    variantDetailsType: ExacVariantDetailsType,
  },
  gnomad: {
    fetchVariantDetails: fetchGnomadVariantDetails,
    variantDetailsType: GnomadVariantDetailsType,
  },
}

export default datasetsConfig

export const datasetSpecificTypes = [ExacVariantDetailsType, GnomadVariantDetailsType]
