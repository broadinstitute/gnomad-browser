/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
} from 'graphql'

import { datasetArgumentTypeForMethod } from '../datasets/datasetArgumentTypes'
import datasetsConfig from '../datasets/datasetsConfig'
import coverageType, { lookUpCoverageByExons } from './coverage'
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
        dataset: { type: datasetArgumentTypeForMethod('fetchExomeCoverageByTranscript') },
      },
      resolve: (obj, args, ctx) => {
        const fetchExomeCoverageByTranscript =
          datasetsConfig[args.dataset].fetchExomeCoverageByTranscript
        return fetchExomeCoverageByTranscript(ctx, obj)
      },
    },
    ge_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: datasetArgumentTypeForMethod('fetchGenomeCoverageByTranscript') },
      },
      resolve: (obj, args, ctx) => {
        const fetchGenomeCoverageByTranscript =
          datasetsConfig[args.dataset].fetchGenomeCoverageByTranscript
        return fetchGenomeCoverageByTranscript(ctx, obj)
      },
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        return lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id).then((exons) => {
          return lookUpCoverageByExons({
            elasticClient: ctx.database.elastic,
            index: 'genome_coverage',
            exons,
            chrom: obj.chrom,
            obj,
            ctx,
          })
        })
      }
    },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        return lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id).then((exons) => {
          return lookUpCoverageByExons({
            elasticClient: ctx.database.elastic,
            index: 'exome_coverage',
            exons,
            chrom: obj.chrom,
            obj,
            ctx,
          })
        })
      }
    },
    exacv1_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        return lookupExonsByTranscriptId(ctx.database.gnomad, obj.transcript_id).then((exons) => {
          return lookUpCoverageByExons({
            elasticClient: ctx.database.elastic,
            index: 'exacv1_coverage',
            exons,
            chrom: obj.chrom,
            obj,
            ctx,
          })
        })
      }
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
