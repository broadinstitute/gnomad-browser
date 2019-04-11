import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

export const MultiNucleotideVariantSummaryType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantSummary',
  fields: {
    combined_variant_id: { type: new GraphQLNonNull(GraphQLString) },
    changes_amino_acids: { type: new GraphQLNonNull(GraphQLBoolean) },
    n_individuals: { type: new GraphQLNonNull(GraphQLInt) },
    other_constituent_snvs: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
  },
})

const MultiNucleotideVariantDetailsSequencingDataType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantDetailsSequencingData',
  fields: {
    ac: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    n_individuals: { type: GraphQLInt },
  },
})

const MultiNucleotideVariantConstituentSNVSequencingDataType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantSNVSequencingData',
  fields: {
    ac: { type: GraphQLInt },
    an: { type: GraphQLInt },
    filters: { type: new GraphQLList(GraphQLString) },
  },
})

const MultiNucleotideVariantConstituentSNVType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantSNVData',
  fields: {
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    exome: { type: MultiNucleotideVariantConstituentSNVSequencingDataType },
    genome: { type: MultiNucleotideVariantConstituentSNVSequencingDataType },
  },
})

const MultiNucleotideVariantConstituentSNVConsequenceType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantConstituentSNVConsequence',
  fields: {
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    amino_acids: { type: new GraphQLNonNull(GraphQLString) },
    codons: { type: new GraphQLNonNull(GraphQLString) },
    consequence: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const MultiNucleotideVariantConsequenceType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantConsequence',
  fields: {
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    gene_name: { type: new GraphQLNonNull(GraphQLString) },
    transcript_id: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: GraphQLString },
    amino_acids: { type: new GraphQLNonNull(GraphQLString) },
    codons: { type: new GraphQLNonNull(GraphQLString) },
    consequence: { type: new GraphQLNonNull(GraphQLString) },
    snv_consequences: {
      type: new GraphQLNonNull(
        new GraphQLList(MultiNucleotideVariantConstituentSNVConsequenceType)
      ),
    },
  },
})

export const MultiNucleotideVariantDetailsType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantDetails',
  fields: {
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    constituent_snvs: {
      type: new GraphQLNonNull(new GraphQLList(MultiNucleotideVariantConstituentSNVType)),
    },
    exome: { type: MultiNucleotideVariantDetailsSequencingDataType },
    genome: { type: MultiNucleotideVariantDetailsSequencingDataType },
    consequences: { type: new GraphQLList(MultiNucleotideVariantConsequenceType) },
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
    index: 'gnomad_2_1_coding_mnvs',
    type: 'mnv',
    size: 10000,
    _source: ['constituent_snv_ids'],
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
  const mnvVariantIds = new Set(mnvs.reduce((acc, mnv) => acc.concat(mnv.constituent_snv_ids), []))

  variants.forEach(variant => {
    if (mnvVariantIds.has(variant.variantId)) {
      variant.flags.push('mnv')
    }
  })

  return variants
}

export const fetchGnomadMNVSummariesByVariantId = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_2_1_coding_mnvs',
    type: 'mnv',
    _source: ['variant_id', 'constituent_snv_ids', 'n_individuals', 'consequences'],
    body: {
      query: {
        bool: {
          filter: {
            term: { constituent_snv_ids: variantId },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle

    const changesAminoAcids = doc.consequences.some(consequence => {
      const snvConsequence = consequence.snv_consequences.find(s => s.variant_id === variantId)
      return snvConsequence.amino_acids.toLowerCase() !== consequence.amino_acids.toLowerCase()
    })

    return {
      combined_variant_id: doc.variant_id,
      changes_amino_acids: changesAminoAcids,
      n_individuals: doc.n_individuals,
      other_constituent_snvs: doc.constituent_snv_ids.filter(snvId => snvId !== variantId),
    }
  })
}

export const fetchGnomadMNVDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_2_1_coding_mnvs',
    type: 'mnv',
    body: {
      query: {
        bool: {
          filter: {
            term: { variant_id: variantId },
          },
        },
      },
    },
    size: 1,
  })

  if (response.hits.hits.length === 0) {
    throw Error('Variant not found')
  }

  const doc = response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle

  return {
    variant_id: doc.variant_id,
    chrom: doc.contig,
    pos: doc.pos,
    ref: doc.ref,
    alt: doc.alt,
    constituent_snvs: doc.constituent_snvs.map(snv => ({
      variant_id: snv.variant_id,
      exome: snv.exome.ac === undefined ? null : snv.exome,
      genome: snv.genome.ac === undefined ? null : snv.genome,
    })),
    exome: doc.exome.ac === undefined ? null : doc.exome,
    genome: doc.genome.ac === undefined ? null : doc.genome,
    consequences: doc.consequences,
  }
}
