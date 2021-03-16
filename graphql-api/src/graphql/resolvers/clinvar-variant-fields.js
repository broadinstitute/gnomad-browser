const { isEmpty } = require('lodash')

const nullifyEmptyObject = (field) => {
  return (obj) => {
    const value = obj[field]
    return isEmpty(value) ? null : value
  }
}

module.exports = {
  ClinVarVariant: {
    gnomad: (variant) => (variant.gnomad.exome || variant.gnomad.genome ? variant.gnomad : null),
  },
  ClinVarVariantGnomadData: {
    exome: nullifyEmptyObject('exome'),
    genome: nullifyEmptyObject('genome'),
  },
}
