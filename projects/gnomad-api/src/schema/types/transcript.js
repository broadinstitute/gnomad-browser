/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
} from 'graphql'

import { withCache } from '../../utilities/redis'
import { mergeOverlappingRegions } from '../../utilities/region'
import { AnyDatasetArgumentType } from '../datasets/datasetArgumentTypes'
import datasetsConfig from '../datasets/datasetsConfig'
import fetchGnomadConstraintByTranscript from '../datasets/gnomad_r2_1/fetchGnomadConstraintByTranscript'
import GnomadConstraintType from '../datasets/gnomad_r2_1/GnomadConstraintType'
import coverageType, { fetchCoverageByTranscript } from './coverage'
import exonType, { lookupExonsByGeneId, lookupExonsByTranscriptId } from './exon'
import { GtexTissueExpressionsType, fetchGtexTissueExpressionsByTranscript } from './gtex'

const transcriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: () => ({
    _id: { type: GraphQLString },
    start: { type: GraphQLInt },
    transcript_id: { type: GraphQLString },
    strand: { type: GraphQLString },
    stop: { type: GraphQLInt },
    xstart: { type: GraphQLFloat },
    chrom: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    xstop: { type: GraphQLFloat },
    exons: {
      type: new GraphQLList(exonType),
      resolve: (obj, args, ctx) =>
       lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id),
    },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:transcript:${index}:${obj.transcript_id}`, async () => {
          const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id)
          return fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons,
          })
        })
      },
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].genomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:transcript:${index}:${obj.transcript_id}`, async () => {
          const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id)
          return fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons,
          })
        })
      },
    },
    gnomad_constraint: {
      type: GnomadConstraintType,
      resolve: (obj, args, ctx) => fetchGnomadConstraintByTranscript(ctx, obj.transcript_id),
    },
    gtex_tissue_tpms_by_transcript: {
      type: GtexTissueExpressionsType,
      resolve: (obj, args, ctx) => fetchGtexTissueExpressionsByTranscript(ctx, obj.transcript_id),
    },
  }),
})

export default transcriptType

export const lookupTranscriptsByTranscriptId = (db, transcript_id, gene_name) =>
  new Promise((resolve) => {
    db.collection('transcripts').findOne({ transcript_id })
      .then(data => resolve({ ...data, gene_name }))
  })

export const lookupAllTranscriptsByGeneId = (db, gene_id) =>
  db.collection('transcripts').find({ gene_id }).toArray()

export const CompositeTranscriptType = new GraphQLObjectType({
  name: 'CompositeTranscript',
  fields: {
    exons: { type: new GraphQLList(exonType) },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:gene:${index}:${obj.gene_id}`, () =>
          fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: obj.exons,
          })
        )
      },
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].genomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `coverage:gene:${index}:${obj.gene_id}`, () =>
          fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: obj.exons,
          })
        )
      },
    },
  },
})

export const fetchCompositeTranscriptByGene = async (ctx, gene) => {
  const allExons = await lookupExonsByGeneId(ctx.database.gnomad, gene.gene_id)
  const sortedExons = allExons.sort((r1, r2) => r1.start - r2.start)

  const cdsExons = allExons.filter(exon => exon.feature_type === 'CDS')
  const utrExons = allExons.filter(exon => exon.feature_type === 'UTR')

  const cdsCompositeExons = mergeOverlappingRegions(cdsExons)
  const utrCompositeExons = mergeOverlappingRegions(utrExons)

  /**
   * There are 3 feature types in the exons collection: "CDS", "UTR", and "exon".
   * There are "exon" regions that cover the "CDS" and "UTR" regions and also
   * some (non-coding) transcripts that contain only "exon" regions.
   * This filters the "exon" regions to only those that are in non-coding transcripts.
   *
   * This makes the UI for selecting visible regions easier, since it can filter
   * on "CDS" or "UTR" feature type without having to also filter out the "exon" regions
   * that duplicate the "CDS" and "UTR" regions.
   */
  const codingTranscripts = new Set(
    allExons
      .filter(exon => exon.feature_type === 'CDS' || exon.feature_type === 'UTR')
      .map(exon => exon.transcript_id)
  )

  const nonCodingTranscriptExons = sortedExons.filter(
    exon => !codingTranscripts.has(exon.transcript_id)
  )

  const nonCodingTranscriptCompositeExons = mergeOverlappingRegions(nonCodingTranscriptExons)

  return {
    gene_id: gene.gene_id,
    chrom: gene.chrom,
    exons: [...cdsCompositeExons, ...utrCompositeExons, ...nonCodingTranscriptCompositeExons],
  }
}
