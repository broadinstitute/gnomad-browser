const { UserVisibleError } = require('../errors')

const GRCh37GeneFieldResolver = (field, label) => {
  return (obj) => {
    const referenceGenome = obj.reference_genome
    if (referenceGenome !== 'GRCh37') {
      throw new UserVisibleError(`${label} is not available on ${referenceGenome}`)
    }

    if (!obj[field]) {
      throw new UserVisibleError(`${label} is not available for this gene`)
    }

    return obj[field]
  }
}

module.exports = {
  Gene: {
    pext: GRCh37GeneFieldResolver('pext', 'pext'),
    gnomad_constraint: GRCh37GeneFieldResolver('gnomad_constraint', 'gnomAD v2 constraint'),
    exac_constraint: GRCh37GeneFieldResolver('exac_constraint', 'ExAC constraint'),
    exac_regional_missense_constraint_regions: GRCh37GeneFieldResolver(
      'exac_regional_missense_constraint_regions',
      'ExAC regional missense constraint'
    ),
  },
}
