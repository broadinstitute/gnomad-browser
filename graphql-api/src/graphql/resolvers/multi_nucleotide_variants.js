const { isVariantId, normalizeVariantId } = require('@gnomad/identifiers')

const { UserVisibleError } = require('../errors')

const DATASET_LABELS = {
  gnomad_r3: 'gnomAD v3',
  gnomad_r2_1: 'gnomAD v2',
  gnomad_r2_1_controls: 'gnomAD v2',
  gnomad_r2_1_non_neuro: 'gnomAD v2',
  gnomad_r2_1_non_cancer: 'gnomAD v2',
  gnomad_r2_1_non_topmed: 'gnomAD v2',
  exac: 'ExAC',
}

const resolveMultiNucleotideVariant = (obj, args, ctx) => {
  if (!isVariantId(args.variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  const variantId = normalizeVariantId(args.variant_id)

  const { dataset } = args
  if (!dataset) {
    throw new UserVisibleError('Dataset is required')
  }

  if (args.dataset !== 'gnomad_r2_1') {
    throw new UserVisibleError(
      `Multi-nucleotide variants are not available for ${DATASET_LABELS[dataset]}`
    )
  }

  return ctx.queryInternalAPI(`/GRCh37/multi_nucleotide_variant/${variantId}/?dataset=${dataset}`)
}

module.exports = {
  Query: {
    multiNucleotideVariant: resolveMultiNucleotideVariant,
  },
}
