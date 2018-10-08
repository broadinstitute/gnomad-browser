import ExacVariantDetailsType from './exac/ExacVariantDetailsType'
import countExacVariantsInRegion from './exac/countExacVariantsInRegion'
import fetchExacVariantDetails from './exac/fetchExacVariantDetails'
import fetchExacVariantsByGene from './exac/fetchExacVariantsByGene'
import fetchExacVariantsByRegion from './exac/fetchExacVariantsByRegion'
import fetchExacVariantsByTranscript from './exac/fetchExacVariantsByTranscript'

import Gnomad202VariantDetailsType from './gnomad_r2_0_2/GnomadVariantDetailsType'
import countGnomad202VariantsInRegion from './gnomad_r2_0_2/countGnomadVariantsInRegion'
import fetchGnomad202VariantDetails from './gnomad_r2_0_2/fetchGnomadVariantDetails'
import fetchGnomad202VariantsByGene from './gnomad_r2_0_2/fetchGnomadVariantsByGene'
import fetchGnomad202VariantsByRegion from './gnomad_r2_0_2/fetchGnomadVariantsByRegion'
import fetchGnomad202VariantsByTranscript from './gnomad_r2_0_2/fetchGnomadVariantsByTranscript'

const datasetsConfig = {
  exac: {
    countVariantsInRegion: countExacVariantsInRegion,
    fetchVariantDetails: fetchExacVariantDetails,
    fetchVariantsByGene: fetchExacVariantsByGene,
    fetchVariantsByRegion: fetchExacVariantsByRegion,
    fetchVariantsByTranscript: fetchExacVariantsByTranscript,
    variantDetailsType: ExacVariantDetailsType,
  },
  gnomad_r2_0_2: {
    countVariantsInRegion: countGnomad202VariantsInRegion,
    fetchVariantDetails: fetchGnomad202VariantDetails,
    fetchVariantsByGene: fetchGnomad202VariantsByGene,
    fetchVariantsByRegion: fetchGnomad202VariantsByRegion,
    fetchVariantsByTranscript: fetchGnomad202VariantsByTranscript,
    variantDetailsType: Gnomad202VariantDetailsType,
  },
}

export default datasetsConfig

export const datasetSpecificTypes = [ExacVariantDetailsType, Gnomad202VariantDetailsType]
