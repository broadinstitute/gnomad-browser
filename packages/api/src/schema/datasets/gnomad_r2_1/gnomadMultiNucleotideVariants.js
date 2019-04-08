import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

export const MultiNucleotideVariantSummaryType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantSummary',
  fields: {
    combinedVariantId: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    nIndividuals: { type: new GraphQLNonNull(GraphQLInt) },
    otherVariantId: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const MultiNucleotideVariantDetailsSequencingDataType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantDetailsSequencingData',
  fields: {
    ac: { type: GraphQLInt },
    acHom: { type: GraphQLInt },
    nIndividuals: { type: GraphQLInt },
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
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    exome: { type: MultiNucleotideVariantConstituentSNVSequencingDataType },
    genome: { type: MultiNucleotideVariantConstituentSNVSequencingDataType },
  },
})

const MultiNucleotideVariantConsequenceVariantDataType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantConsequenceVariantData',
  fields: {
    aminoAcidChange: { type: new GraphQLNonNull(GraphQLString) },
    codonChange: { type: new GraphQLNonNull(GraphQLString) },
    consequence: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const MultiNucleotideVariantConsequenceType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantConsequence',
  fields: {
    geneId: { type: new GraphQLNonNull(GraphQLString) },
    geneSymbol: { type: new GraphQLNonNull(GraphQLString) },
    transcriptId: { type: new GraphQLNonNull(GraphQLString) },
    snv1: { type: MultiNucleotideVariantConsequenceVariantDataType },
    snv2: { type: MultiNucleotideVariantConsequenceVariantDataType },
    mnv: { type: MultiNucleotideVariantConsequenceVariantDataType },
    category: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const MultiNucleotideVariantDetailsType = new GraphQLObjectType({
  name: 'MultiNucleotideVariantDetails',
  fields: {
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    snv1: { type: MultiNucleotideVariantConstituentSNVType },
    snv2: { type: MultiNucleotideVariantConstituentSNVType },
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
    index: 'gnomad_2_1_mnv_coding',
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

export const fetchGnomadMNVSummariesByVariantId = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_2_1_mnv_coding',
    type: 'mnv',
    _source: ['mnv', 'snp1', 'snp2', 'n_indv', 'consequences'],
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

    const otherVariant = variantId === doc.snp1 ? 'snp2' : 'snp1'
    return {
      combinedVariantId: doc.mnv,
      category: doc.consequences[0].category,
      nIndividuals: doc.n_indv.total,
      otherVariantId: doc[otherVariant],
    }
  })
}

export const fetchGnomadMNVDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_2_1_mnv_coding',
    type: 'mnv',
    body: {
      query: {
        bool: {
          filter: {
            term: { mnv: variantId },
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

  const isSnv1PresentInExome = doc.an.snp1.exome !== undefined
  const isSnv1PresentInGenome = doc.an.snp1.genome !== undefined

  const isSnv2PresentInExome = doc.an.snp2.exome !== undefined
  const isSnv2PresentInGenome = doc.an.snp2.genome !== undefined

  const isMnvPresentInExome = isSnv1PresentInExome && isSnv2PresentInExome
  const isMnvPresentInGenome = isSnv1PresentInGenome && isSnv2PresentInGenome

  return {
    variantId: doc.mnv,
    chrom: doc.contig,
    pos: doc.pos,
    snv1: {
      variantId: doc.snp1,
      exome: isSnv1PresentInExome
        ? {
            ac: doc.ac.snp1.exome,
            an: doc.an.snp1.exome,
            filters: doc.filters.snp1.exome,
          }
        : null,
      genome: isSnv1PresentInGenome
        ? {
            ac: doc.ac.snp1.genome,
            an: doc.an.snp1.genome,
            filters: doc.filters.snp1.genome,
          }
        : null,
    },
    snv2: {
      variantId: doc.snp2,
      exome: isSnv2PresentInExome
        ? {
            ac: doc.ac.snp2.exome,
            an: doc.an.snp2.exome,
            filters: doc.filters.snp2.exome,
          }
        : null,
      genome: isSnv2PresentInGenome
        ? {
            ac: doc.ac.snp2.genome,
            an: doc.an.snp2.genome,
            filters: doc.filters.snp2.genome,
          }
        : null,
    },
    exome: isMnvPresentInExome
      ? {
          ac: doc.ac.mnv.exome,
          acHom: doc.n_homhom.exome,
          nIndividuals: doc.n_indv.exome,
        }
      : null,
    genome: isMnvPresentInGenome
      ? {
          ac: doc.ac.mnv.genome,
          acHom: doc.n_homhom.genome,
          nIndividuals: doc.n_indv.genome,
        }
      : null,
    consequences: doc.consequences.map(csq => ({
      geneId: csq.gene_id,
      geneSymbol: csq.gene_name,
      transcriptId: csq.transcript_id,
      snv1: {
        aminoAcidChange: csq.snp1.amino_acids,
        codonChange: csq.snp1.codons,
        consequence: csq.snp1.consequence,
      },
      snv2: {
        aminoAcidChange: csq.snp2.amino_acids,
        codonChange: csq.snp2.codons,
        consequence: csq.snp2.consequence,
      },
      mnv: {
        aminoAcidChange: csq.mnv.amino_acids,
        codonChange: csq.mnv.codons,
        consequence: csq.mnv.consequence,
      },
      category: csq.category,
    })),
  }
}
