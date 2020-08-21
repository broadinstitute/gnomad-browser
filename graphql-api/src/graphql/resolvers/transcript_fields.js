const { UserVisibleError } = require('../errors')

const GRCh37TranscriptFieldResolver = (field, label) => {
  return (obj) => {
    const referenceGenome = obj.reference_genome
    if (referenceGenome !== 'GRCh37') {
      throw new UserVisibleError(`${label} is not available on ${referenceGenome}`)
    }

    if (!obj[field]) {
      throw new UserVisibleError(`${label} is not available for this transcript`)
    }

    return obj[field]
  }
}

module.exports = {
  Transcript: {
    gtex_tissue_expression: GRCh37TranscriptFieldResolver(
      'gtex_tissue_expression',
      'GTEx tissue expression'
    ),
    gnomad_constraint: GRCh37TranscriptFieldResolver('gnomad_constraint', 'gnomAD v2 constraint'),
    exac_constraint: GRCh37TranscriptFieldResolver('exac_constraint', 'ExAC constraint'),
  },
}
