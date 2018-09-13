import ExacVariantDetailsType from './exac/ExacVariantDetailsType'
import fetchExacVariantDetails from './exac/fetchExacVariantDetails'

import GnomadVariantDetailsType from './gnomad/GnomadVariantDetailsType'
import fetchGnomadVariantDetails from './gnomad/fetchGnomadVariantDetails'

const datasetsConfig = {
  exac: {
    fetchVariantDetails: fetchExacVariantDetails,
    variantDetailsType: ExacVariantDetailsType,
  },
  gnomad: {
    fetchVariantDetails: fetchGnomadVariantDetails,
    variantDetailsType: GnomadVariantDetailsType,
  },
}

export default datasetsConfig

export const datasetSpecificTypes = [ExacVariantDetailsType, GnomadVariantDetailsType]
