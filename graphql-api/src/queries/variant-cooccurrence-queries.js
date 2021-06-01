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
  const exomeFreq = variant.exome.freq.gnomad

  return {
    nHomAlt: exomeFreq.homozygote_count,
    nHet: exomeFreq.ac - 2 * exomeFreq.homozygote_count,
    nHomRef: exomeFreq.an / 2 - exomeFreq.ac + exomeFreq.homozygote_count, // AN / 2 - nHomAlt - nHet
    populations: exomeFreq.populations
      .filter((pop) => !(pop.id.includes('_') || pop.id === 'XX' || pop.id === 'XY'))
      .map((exomePop) => {
        return {
          id: exomePop.id,
          nHomAlt: exomePop.homozygote_count,
          nHet: exomePop.ac - 2 * exomePop.homozygote_count,
          nHomRef: exomePop.an / 2 - exomePop.ac + exomePop.homozygote_count, // AN / 2 - nHomAlt - nHet
        }
      }),
  }
}

// JS port of Hail's hl.experimental.haplotypeFreqEM
// https://github.com/hail-is/hail/blob/1a861505c1fc2ea3c9d7b32a47be7af10d13907c/hail/src/main/scala/is/hail/experimental/package.scala
//
// Input genotype counts must be ordered [AABB, AABb, AAbb, AaBB, AaBb, Aabb, aaBB, aaBb, aabb]
// Output haplotype counts are ordered [AB, aB, Ab, ab]
const estimateHaplotypeCounts = (genotypeCounts) => {
  assert.equal(genotypeCounts.length, 9, 'Counts for 9 possible genotype combinations are required')

  const nSamples = genotypeCounts.reduce((acc, n) => acc + n, 0)

  // Need some non-ref samples to compute
  if (genotypeCounts[0] === nSamples) {
    return null
  }

  const nHaplotypes = nSamples * 2

  const counts = [
    2.0 * genotypeCounts[0] + genotypeCounts[1] + genotypeCounts[3], // n.AB => 2*n.AABB + n.AABb + n.AaBB
    2.0 * genotypeCounts[6] + genotypeCounts[3] + genotypeCounts[7], // n.aB => 2*n.aaBB + n.AaBB + n.aaBb
    2.0 * genotypeCounts[2] + genotypeCounts[1] + genotypeCounts[5], // n.Ab => 2*n.AAbb + n.AABb + n.Aabb
    2.0 * genotypeCounts[8] + genotypeCounts[5] + genotypeCounts[7], // n.ab => 2*n.aabb + n.Aabb + n.aaBb
  ]

  // Initial estimate with AaBb contributing equally to each haplotype
  let pNext = counts.map((n) => n + genotypeCounts[4] / 2).map((n) => n / nHaplotypes)
  let pCurrent = pNext.map((p) => p + 1)

  // EM
  let iterations = 0
  while (
    Math.max(...zip(pNext, pCurrent).map(([a, b]) => Math.abs(a - b))) > 1e-7 &&
    iterations <= 100
  ) {
    pCurrent = pNext

    const k = pCurrent[0] * pCurrent[3] + pCurrent[1] * pCurrent[2]
    pNext = [
      pCurrent[0] * pCurrent[3],
      pCurrent[1] * pCurrent[2],
      pCurrent[1] * pCurrent[2],
      pCurrent[0] * pCurrent[3],
    ]
      .map((p) => p * (genotypeCounts[4] / k))
      .map((p, i) => p + counts[i])
      .map((p) => p / nHaplotypes)

    iterations += 1
  }

  const haplotypeCounts = pNext.map((p) => p * nHaplotypes)

  return haplotypeCounts.some((n) => Number.isNaN(n)) ? null : haplotypeCounts
}

// See https://github.com/broadinstitute/gnomad_chets/blob/8586cdd36931780bfc127573fbb31da185a44209/phasing.py#L140-L148
const getProbabilityCompoundHeterozygous = (haplotypeCounts) => {
  const pCompoundHeterozygous =
    (haplotypeCounts[1] * haplotypeCounts[2]) /
    (haplotypeCounts[0] * haplotypeCounts[3] + haplotypeCounts[1] * haplotypeCounts[2])
  return Number.isNaN(pCompoundHeterozygous) ? null : pCompoundHeterozygous
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

  const genotypeCounts = [
    Math.min(variantCategoryCountsA.nHomRef, variantCategoryCountsB.nHomRef), // AABB
    variantCategoryCountsB.nHet, // AABb
    variantCategoryCountsB.nHomAlt, // AAbb
    variantCategoryCountsA.nHet, // AaBB
    0, // AaBb
    0, // Aabb
    variantCategoryCountsA.nHomAlt, // aaBB
    0, // aaBb
    0, // aabb
  ]

  const haplotypeCounts = estimateHaplotypeCounts(genotypeCounts)

  return {
    variant_ids: variantIds,
    genotype_counts: genotypeCounts,
    haplotype_counts: haplotypeCounts,
    p_compound_heterozygous: haplotypeCounts
      ? getProbabilityCompoundHeterozygous(haplotypeCounts)
      : null,
    populations: zip(variantCategoryCountsA.populations, variantCategoryCountsB.populations).map(
      ([popCategoryCountsA, popCategoryCountsB]) => {
        assert.equal(
          popCategoryCountsA.id,
          popCategoryCountsB.id,
          'Expected variant population frequencies to be in the same order'
        )

        const popGenotypeCounts = [
          Math.min(popCategoryCountsA.nHomRef, popCategoryCountsB.nHomRef), // AABB
          popCategoryCountsB.nHet, // AABb
          popCategoryCountsB.nHomAlt, // AAbb
          popCategoryCountsA.nHet, // AaBB
          0, // AaBb
          0, // Aabb
          popCategoryCountsA.nHomAlt, // aaBB
          0, // aaBb
          0, // aabb
        ]

        const popHaplotypeCounts = estimateHaplotypeCounts(popGenotypeCounts)

        return {
          id: popCategoryCountsA.id,
          genotype_counts: popGenotypeCounts,
          haplotype_counts: popHaplotypeCounts,
          p_compound_heterozygous: popHaplotypeCounts
            ? getProbabilityCompoundHeterozygous(popHaplotypeCounts)
            : null,
        }
      }
    ),
  }
}

module.exports = {
  fetchVariantCooccurrence,
}
