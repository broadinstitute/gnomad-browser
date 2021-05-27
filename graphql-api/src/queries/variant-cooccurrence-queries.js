const assert = require('assert').strict

const { zip } = require('lodash')

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

  if (!variants.every((variant) => Boolean(variant.exome))) {
    throw new UserVisibleError(
      'Variant co-occurrence is only available for variants that appear in gnomAD exome samples'
    )
  }

  if (
    !variants
      .map((variant) => ((variant.exome || {}).ac || 0) / ((variant.exome || {}).an || 1))
      .every((af) => af <= 0.05)
  ) {
    throw new UserVisibleError(
      'Variant co-occurrence is only available for variants with a global allele frequency ≤ 5%'
    )
  }
}

const getCategoryCounts = (variant) => {
  // gnomAD v2 and v3 have the frequencies for the full dataset stored under different keys.
  // gnomAD v2 uses "gnomad" and v3 "all". This code currently only supports gnomAD v2.
  const exomeFreq = ((variant.exome || {}).freq || {}).gnomad || {}
  const genomeFreq = ((variant.genome || {}).freq || {}).gnomad || {}

  const exomeAncestryPopulationFrequencies = (exomeFreq.populations || []).filter(
    (pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
  )
  const genomeAncestryPopulationFrequencies = (genomeFreq.populations || []).filter(
    (pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY')
  )

  const ac = (exomeFreq.ac || 0) + (genomeFreq.ac || 0)
  const an = (exomeFreq.an || 0) + (genomeFreq.an || 0)
  const nHomAlt = (exomeFreq.homozygote_count || 0) + (genomeFreq.homozygote_count || 0)
  const nHet = ac - 2 * nHomAlt
  const nHomRef = an / 2 - ac + nHomAlt // AN / 2 - nHomAlt - nHet

  return {
    nHomAlt,
    nHet,
    nHomRef,
    populations: zip(exomeAncestryPopulationFrequencies, genomeAncestryPopulationFrequencies).map(
      ([exomePopFreq, genomePopFreq]) => {
        if (exomePopFreq !== undefined && genomePopFreq !== undefined) {
          assert.equal(
            exomePopFreq.id,
            genomePopFreq.id,
            'Exome and genome populations are not in the same order'
          )
        }

        const acPop = ((exomePopFreq || {}).ac || 0) + ((genomePopFreq || {}).ac || 0)
        const anPop = ((exomePopFreq || {}).an || 0) + ((genomePopFreq || {}).an || 0)
        const nHomAltPop =
          ((exomePopFreq || {}).homozygote_count || 0) +
          ((genomePopFreq || {}).homozygote_count || 0)
        const nHetPop = acPop - 2 * nHomAltPop
        const nHomRefPop = anPop / 2 - acPop + nHomAlt // AN / 2 - nHomAlt - nHet

        return {
          id: (exomePopFreq || genomePopFreq).id,
          nHomAlt: nHomAltPop,
          nHet: nHetPop,
          nHomRef: nHomRefPop,
        }
      }
    ),
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

  if (results.length) {
    return results[0]
  }

  // If no record for the variant pair is in the database, then there are no samples carrying both
  // variants and co-occurrence can be computed from public variant data.

  // genotype_counts are [AABB, AABb, AAbb, AaBB, AaBb, Aabb, aaBB, aaBb, aabb],
  // where A/B are reference alleles and a/b are alternate alleles of variants.

  const variantCategoryCountsA = getCategoryCounts(variants[0])
  const variantCategoryCountsB = getCategoryCounts(variants[1])

  return {
    variant_ids: variantIds,
    genotype_counts: [
      Math.min(variantCategoryCountsA.nHomRef, variantCategoryCountsB.nHomRef), // AABB
      variantCategoryCountsB.nHet, // AABb
      variantCategoryCountsB.nHomAlt, // AAbb
      variantCategoryCountsA.nHet, // AaBB
      0, // AaBb
      0, // Aabb
      variantCategoryCountsA.nHomAlt, // aaBB
      0, // aaBb
      0, // aabb
    ],
    haplotype_counts: null,
    p_compound_heterozygous: null,
    populations: zip(variantCategoryCountsA.populations, variantCategoryCountsB.populations).map(
      ([popCategoryCountsA, popCategoryCountsB]) => {
        assert.equal(
          popCategoryCountsA.id,
          popCategoryCountsB.id,
          'Expected variant population frequencies to be in the same order'
        )
        return {
          id: popCategoryCountsA.id,
          genotype_counts: [
            Math.min(popCategoryCountsA.nHomRef, popCategoryCountsB.nHomRef), // AABB
            popCategoryCountsB.nHet, // AABb
            popCategoryCountsB.nHomAlt, // AAbb
            popCategoryCountsA.nHet, // AaBB
            0, // AaBb
            0, // Aabb
            popCategoryCountsA.nHomAlt, // aaBB
            0, // aaBb
            0, // aabb
          ],
          haplotype_counts: null,
          p_compound_heterozygous: null,
        }
      }
    ),
  }
}

module.exports = {
  fetchVariantCooccurrence,
}
