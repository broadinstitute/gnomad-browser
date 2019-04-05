import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

export const GnomadMultiNucleotideVariantType = new GraphQLObjectType({
  name: 'GnomadMultiNucleotideVariant',
  fields: {
    nIndividuals: { type: GraphQLInt },
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
    index: 'gnomad_mnv_coding_2_1',
    type: 'mnv',
    size: 10000,
    _source: ['pos', 'snp1', 'snp2'],
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
    mnvVariantIds.add(mnv.snp1)
    mnvVariantIds.add(mnv.snp2)
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
    index: 'gnomad_mnv_coding_2_1',
    type: 'mnv',
    _source: ['snp1', 'snp2', 'n_indv', 'consequences'],
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              should: [{ term: { snp1: variantId } }, { term: { snp2: variantId } }],
            },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle

    let thisVariant
    let otherVariant
    if (variantId === doc.snp1) {
      thisVariant = 'snp1'
      otherVariant = 'snp2'
    } else {
      thisVariant = 'snp2'
      otherVariant = 'snp1'
    }

    const consequence = doc.consequences[0]

    return {
      nIndividuals: doc.n_indv.total,
      category: consequence.category,
      mnvAminoAcidChange: consequence.mnv.amino_acids.replace('/', ' → '),
      mnvCodonChange: consequence.mnv.codons.toUpperCase().replace('/', ' → '),
      mnvConsequence: consequence.mnv.consequence,
      otherVariantId: doc[otherVariant],
      otherAminoAcidChange: consequence[otherVariant].amino_acids.replace('/', ' → '),
      otherCodonChange: consequence[otherVariant].codons.toUpperCase().replace('/', ' → '),
      otherConsequence: consequence[otherVariant].consequence,
      snvAminoAcidChange: consequence[thisVariant].amino_acids.replace('/', ' → '),
      snvCodonChange: consequence[thisVariant].codons.toUpperCase().replace('/', ' → '),
      snvConsequence: consequence[thisVariant].consequence,
    }
  })
}
