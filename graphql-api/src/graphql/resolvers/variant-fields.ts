import { resolveVACohortAlleleFrequencies, resolveVAAllele } from './va'

const resolvers = {
  Variant: {
    rsids: (obj: any) => obj.rsids || [],
    va: resolveVACohortAlleleFrequencies,
    vrs: resolveVAAllele,
  },
  VariantDetails: {
    rsids: (obj: any) => obj.rsids || [],
    va: resolveVACohortAlleleFrequencies,
    vrs: resolveVAAllele,
  },
}
export default resolvers
