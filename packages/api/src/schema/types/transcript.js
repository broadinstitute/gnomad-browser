/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
} from 'graphql'

import { withCache } from '../../utilities/redis'
import { AnyDatasetArgumentType } from '../datasets/datasetArgumentTypes'
import datasetsConfig from '../datasets/datasetsConfig'
import fetchGnomadConstraintByTranscript from '../datasets/gnomad_r2_1/fetchGnomadConstraintByTranscript'
import GnomadConstraintType from '../datasets/gnomad_r2_1/GnomadConstraintType'
import coverageType, { fetchCoverageByTranscript } from './coverage'
import exonType, { lookupExonsByTranscriptId } from './exon'
import * as fromGtex from './gtex'

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
    ex_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].exomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `${index}-coverage-${obj.gene_name}`, async () => {
          const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id)
          return fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: exons.filter(exon => exon.feature_type === 'CDS'),
          })
        })
      },
    },
    ge_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: AnyDatasetArgumentType },
      },
      resolve: async (obj, args, ctx) => {
        const { index, type } = datasetsConfig[args.dataset].genomeCoverageIndex
        if (!index) {
          return []
        }
        return withCache(ctx, `${index}-coverage-${obj.gene_name}`, async () => {
          const exons = await lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id)
          return fetchCoverageByTranscript(ctx, {
            index,
            type,
            chrom: obj.chrom,
            exons: exons.filter(exon => exon.feature_type === 'CDS'),
          })
        })
      },
    },
    gnomad_constraint: {
      type: GnomadConstraintType,
      resolve: (obj, args, ctx) => fetchGnomadConstraintByTranscript(ctx, obj.transcript_id),
    },
    gtex_tissue_tpms_by_transcript: {
      type: fromGtex.tissuesByTranscript,
      resolve: (obj, args, ctx) =>
      fromGtex.lookUpTranscriptTissueExpression({
        elasticClient: ctx.database.elastic,
        transcriptId: obj.transcript_id,
      }),
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
