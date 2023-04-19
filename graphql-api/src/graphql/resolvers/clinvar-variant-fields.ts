import { isEmpty } from 'lodash'

const nullifyEmptyObject = (field: any) => {
  return (obj: any) => {
    const value = obj[field]
    return isEmpty(value) ? null : value
  }
}

const resolvers = {
  ClinVarVariant: {
    gnomad: (variant: any) =>
      variant.gnomad.exome || variant.gnomad.genome ? variant.gnomad : null,
  },
  ClinVarVariantDetails: {
    gnomad: (variant: any) =>
      variant.gnomad.exome || variant.gnomad.genome ? variant.gnomad : null,
  },
  ClinVarVariantGnomadData: {
    exome: nullifyEmptyObject('exome'),
    genome: nullifyEmptyObject('genome'),
  },
}

export default resolvers
