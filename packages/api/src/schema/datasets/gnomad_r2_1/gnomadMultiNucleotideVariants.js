import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

export const GnomadMultiNucleotideVariantType = new GraphQLObjectType({
  name: 'GnomadMultiNucleotideVariant',
  fields: {
    ac: { type: GraphQLInt },
    category: { type: GraphQLString },
    mnvAminoAcidChange: { type: GraphQLString },
    mnvCodonChange: { type: GraphQLString },
    mnvConsequence: { type: GraphQLString },
    otherVariantId: { type: GraphQLString },
    otherAminoAcidChange: { type: GraphQLString },
    otherCodonChange: { type: GraphQLString },
    otherConsequence: { type: GraphQLString },
    snvAminoAcidChange: { type: GraphQLString },
    snvConsequence: { type: GraphQLString },
    snvCodonChange: { type: GraphQLString },
  },
})

export const fetchGnomadMNVsByIntervals = async (ctx, intervals) => {
  const rangeQueries = intervals.map(region => ({
    range: {
      xpos: {
        // An MNV's pos/xpos contains the position of the first SNP in the pair
        // The second SNP will be one or two base pairs after the first.
        gte: region.xstart - 2,
        lte: region.xstop,
      },
    },
  }))

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_exome_mnvs_2_1',
    type: 'mnv',
    size: 10000,
    _source: ['pos', 'snp1_variant_id', 'snp2_variant_id'],
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              should: rangeQueries,
            },
          },
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}

// Add an 'mnv' flag to variants that are part of a MNV.
// Requires the variants list to be sorted by position.
export const annotateVariantsWithMNVFlag = (variants, mnvs) => {
  const mnvVariantIds = new Set()
  mnvs.forEach(mnv => {
    mnvVariantIds.add(mnv.snp1_variant_id)
    mnvVariantIds.add(mnv.snp2_variant_id)
  })

  variants.forEach(variant => {
    if (mnvVariantIds.has(variant.variantId)) {
      variant.flags.push('mnv')
    }
  })

  return variants
}

export const fetchGnomadMNVsByVariantId = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_exome_mnvs_2_1',
    type: 'mnv',
    _source: [
      'AC_mnv',
      'category',
      'mnv_amino_acids',
      'mnv_codons',
      'mnv_consequence',
      'snp1_amino_acids',
      'snp1_codons',
      'snp1_consequence',
      'snp1_variant_id',
      'snp2_amino_acids',
      'snp2_codons',
      'snp2_consequence',
      'snp2_variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              should: [
                { term: { snp1_variant_id: variantId } },
                { term: { snp2_variant_id: variantId } },
              ],
            },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const mnv = hit._source // eslint-disable-line no-underscore-dangle

    let thisVariant
    let otherVariant
    if (variantId === mnv.snp1_variant_id) {
      thisVariant = 'snp1'
      otherVariant = 'snp2'
    } else {
      thisVariant = 'snp2'
      otherVariant = 'snp1'
    }

    return {
      ac: mnv.AC_mnv,
      category: mnv.category,
      mnvAminoAcidChange: mnv.mnv_amino_acids.replace('/', ' → '),
      mnvCodonChange: mnv.mnv_codons.toUpperCase().replace('/', ' → '),
      mnvConsequence: mnv.mnv_consequence,
      otherVariantId: mnv[`${otherVariant}_variant_id`],
      otherAminoAcidChange: mnv[`${otherVariant}_amino_acids`].replace('/', ' → '),
      otherCodonChange: mnv[`${otherVariant}_codons`].toUpperCase().replace('/', ' → '),
      otherConsequence: mnv[`${otherVariant}_consequence`],
      snvAminoAcidChange: mnv[`${thisVariant}_amino_acids`].replace('/', ' → '),
      snvCodonChange: mnv[`${thisVariant}_codons`].toUpperCase().replace('/', ' → '),
      snvConsequence: mnv[`${thisVariant}_consequence`],
    }
  })
}
