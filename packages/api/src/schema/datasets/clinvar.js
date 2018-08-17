import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { mergeOverlappingRegions } from '../../utilities/region'
import { lookupExonsByGeneId, lookupExonsByTranscriptId } from '../types/exon'
import { VariantInterface } from '../types/variant'
import { fetchAllSearchResults } from '../../utilities/elasticsearch'


export const ClinvarVariantType = new GraphQLObjectType({
  name: 'ClinvarVariant',
  interfaces: [VariantInterface],
  fields: {
    // common variant fields
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    // ClinVar specific fields
    alleleId: { type: GraphQLInt },
    clinicalSignificance: { type: GraphQLString },
    goldStars: { type: GraphQLInt },
    majorConsequence: { type: GraphQLString },
  },
  isTypeOf: variantData => variantData.dataset === 'clinvar',
})


const rangeQueriesForRegions = (regions, padding = 75) => {
  const paddedRegions = regions.map(region => ({
    xstart: region.xstart - padding,
    xstop: region.xstop + padding,
  }))

  const queryRegions = mergeOverlappingRegions(
    paddedRegions.sort((r1, r2) => r1.xstart - r2.xstart)
  )

  return queryRegions.map(
    ({ xstart, xstop }) => ({ range: { xpos: { gte: xstart, lte: xstop } } })
  )
}


export const fetchClinvarVariantsInGene = async (geneId, ctx) => {
  const geneExons = await lookupExonsByGeneId(ctx.database.gnomad, geneId)
  const filteredExons = geneExons.filter(exon => exon.feature_type === 'CDS')
  const rangeQueries = rangeQueriesForRegions(filteredExons)

  const results = await fetchAllSearchResults(
    ctx.database.elastic,
    {
      index: 'clinvar_grch37',
      type: 'variant',
      body: {
        query: {
          bool: {
            filter: [
              { term: { gene_ids: geneId } },
              { bool: { should: rangeQueries } },
            ],
          },
        }
      },
      size: 10000,
      sort: 'xpos:asc',
      _source: [
        'allele_id',
        'alt',
        'chrom',
        'clinical_significance',
        'gene_id_to_consequence_json',
        'gold_stars',
        'pos',
        'ref',
        'variant_id',
        'xpos',
      ],
    }
  )

  return results.map((hit) => {
    const doc = hit._source
    const majorConsequence = JSON.parse(doc.gene_id_to_consequence_json)[geneId]

    return {
      // common variant fields
      alt: doc.alt,
      chrom: doc.chrom,
      pos: doc.pos,
      ref: doc.ref,
      variantId: doc.variant_id,
      xpos: doc.xpos,
      dataset: 'clinvar',
      // ClinVar specific fields
      alleleId: doc.allele_id,
      clinicalSignificance: doc.clinical_significance,
      goldStars: doc.gold_stars,
      majorConsequence,
    }
  })
}


export const fetchClinvarVariantsInTranscript = async (transcriptId, ctx) => {
  const transcriptExons = await lookupExonsByTranscriptId(ctx.database.gnomad, transcriptId)
  const filteredExons = transcriptExons.filter(exon => exon.feature_type === 'CDS')
  const rangeQueries = rangeQueriesForRegions(filteredExons)

  const results = await fetchAllSearchResults(
    ctx.database.elastic,
    {
      index: 'clinvar_grch37',
      type: 'variant',
      body: {
        query: {
          bool: {
            filter: [
              { term: { transcript_ids: transcriptId } },
              { bool: { should: rangeQueries } },
            ],
          },
        }
      },
      size: 10000,
      sort: 'xpos:asc',
      _source: [
        'allele_id',
        'alt',
        'chrom',
        'clinical_significance',
        'gold_stars',
        'pos',
        'ref',
        'transcript_id_to_consequence_json',
        'variant_id',
        'xpos',
      ],
    }
  )

  return results.map((hit) => {
    const doc = hit._source
    const majorConsequence = JSON.parse(doc.transcript_id_to_consequence_json)[transcriptId]

    return {
      // common variant fields
      alt: doc.alt,
      chrom: doc.chrom,
      pos: doc.pos,
      ref: doc.ref,
      variantId: doc.variant_id,
      xpos: doc.xpos,
      dataset: 'clinvar',
      // ClinVar specific fields
      alleleId: doc.allele_id,
      clinicalSignificance: doc.clinical_significance,
      goldStars: doc.gold_stars,
      majorConsequence,
    }
  })
}
