const { isVariantId } = require('@gnomad/identifiers')

const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')
const { fetchVariantById } = require('./variant-queries')

const VARIANT_COOCCURRENCE_INDICES = {
  gnomad_r2_1: 'gnomad_v2_variant_cooccurrence',
}

const CODING_AND_UTR_VEP_CONSEQUENCES = new Set([
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
  'inframe_insertion',
  'inframe_deletion',
  'missense_variant',
  'protein_altering_variant',
  'incomplete_terminal_codon_variant',
  'stop_retained_variant',
  'synonymous_variant',
  'coding_sequence_variant',
  'mature_miRNA_variant',
  '5_prime_UTR_variant',
  '3_prime_UTR_variant',
])

const assertCooccurrenceShouldBeAvailable = (variants) => {
  const variantGenes = variants.map(
    (variant) => new Set(variant.transcript_consequences.map((csq) => csq.gene_id))
  )

  const genesInCommon = variantGenes.reduce(
    (acc, genes) => new Set([...acc].filter((geneId) => genes.has(geneId)))
  )

  if (genesInCommon.size === 0) {
    throw new UserVisibleError(
      'Variant co-occurrence is only available for variants that occur in the same gene'
    )
  }

  if (
    !Array.from(genesInCommon).some((geneId) =>
      variants.every((variant) =>
        variant.transcript_consequences
          .filter((csq) => csq.gene_id === geneId)
          .some((csq) => CODING_AND_UTR_VEP_CONSEQUENCES.has(csq.major_consequence))
      )
    )
  ) {
    throw new UserVisibleError(
      'Variant co-occurrence is only available for coding or UTR variants that occur in the same gene'
    )
  }

  if (
    !variants
      .map(
        (variant) =>
          (((variant.exome || {}).ac || 0) + ((variant.genome || {}).ac || 0)) /
          (((variant.exome || {}).an || 0) + ((variant.genome || {}).an || 0) || 1)
      )
      .every((af) => af <= 0.05)
  ) {
    throw new UserVisibleError(
      'Variant co-occurrence is only available for variants with a global allele frequency ≤ 5%'
    )
  }
}

const fetchVariantCooccurrence = async (es, dataset, variantIds) => {
  if (variantIds.length !== 2) {
    throw new UserVisibleError('A pair of variants is required')
  }

  if (!variantIds.every((variantId) => isVariantId(variantId))) {
    throw new UserVisibleError('Invalid variant ID')
  }

  if (variantIds[0] === variantIds[1]) {
    throw new UserVisibleError('Variants must be different')
  }

  if (dataset !== 'gnomad_r2_1') {
    throw new UserVisibleError(
      `Variant cooccurrence is not available for ${DATASET_LABELS[dataset]}`
    )
  }

  const variants = await Promise.all(
    variantIds.map(async (variantId) => {
      try {
        return await fetchVariantById(es, dataset, variantId)
      } catch (error) {
        if (error.message === 'Variant not found') {
          throw new UserVisibleError(
            'Variant co-occurrence is only available for variants found in gnomAD'
          )
        }
        throw error
      }
    })
  )

  assertCooccurrenceShouldBeAvailable(variants)

  const response = await es.search({
    index: VARIANT_COOCCURRENCE_INDICES[dataset],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { variant_ids: variantIds[0] } },
            { term: { variant_ids: variantIds[1] } },
          ],
        },
      },
    },
    size: 1,
  })

  const results = response.body.hits.hits.map((hit) => hit._source.value)

  if (results.length === 0) {
    throw new UserVisibleError('There are no carriers of both variants in gnomAD')
  }

  return results[0]
}

module.exports = {
  fetchVariantCooccurrence,
}
