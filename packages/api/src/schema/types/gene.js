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

import {
  ClinvarVariantType,
  fetchClinvarVariantsInGene,
  fetchClinvarVariantsInTranscript,
} from '../datasets/clinvar'

import transcriptType, { lookupTranscriptsByTranscriptId, lookupAllTranscriptsByGeneId } from './transcript'
import exonType, { lookupExonsByGeneId } from './exon'
import constraintType, { lookUpConstraintByTranscriptId } from './constraint'

import * as fromRegionalConstraint from './regionalConstraint'

import { VariantSummaryType } from './variant'

const geneType = new GraphQLObjectType({
  name: 'Gene',
  fields: () => ({
    _id: { type: GraphQLString },
    omim_description: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    omim_accession: { type: GraphQLString },
    chrom: { type: GraphQLString },
    strand: { type: GraphQLString },
    full_gene_name: { type: GraphQLString },
    gene_name_upper: { type: GraphQLString },
    other_names: { type: new GraphQLList(GraphQLString) },
    canonical_transcript: { type: GraphQLString },
    start: { type: GraphQLInt },
    stop: { type: GraphQLInt },
    xstop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    gene_name: { type: GraphQLString },
    clinvar_variants: {
      type: new GraphQLList(ClinvarVariantType),
      args: {
        transcriptId: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        return args.transcriptId
          ? fetchClinvarVariantsInTranscript(args.transcriptId, ctx)
          : fetchClinvarVariantsInGene(obj.gene_id, ctx)
      },
    },
    transcript: {
      type: transcriptType,
      resolve: (obj, args, ctx) =>
        lookupTranscriptsByTranscriptId(ctx.database.gnomad, obj.canonical_transcript, obj.gene_name),
    },
    transcripts: {
      type: new GraphQLList(transcriptType),
      resolve: (obj, args, ctx) =>
        lookupAllTranscriptsByGeneId(ctx.database.gnomad, obj.gene_id),
    },
    exons: {
      type: new GraphQLList(exonType),
      resolve: (obj, args, ctx) => lookupExonsByGeneId(ctx.database.gnomad, obj.gene_id),
    },
    exacv1_constraint: {
      type: constraintType,
      resolve: (obj, args, ctx) =>
        lookUpConstraintByTranscriptId(ctx.database.gnomad, obj.canonical_transcript),
    },
    exacv1_regional_constraint_regions: {
      type: new GraphQLList(fromRegionalConstraint.regionalConstraintRegion),
      resolve: (obj, args, ctx) =>
        fromRegionalConstraint.lookUpRegionalConstraintRegions({
          elasticClient: ctx.database.elastic,
          geneName: obj.gene_name,
        }),
    },
    exacv1_regional_gene_stats: {
      type: fromRegionalConstraint.regionalConstraintGeneStatsType,
      resolve: (obj, args, ctx) =>
      fromRegionalConstraint.lookUpRegionalConstraintGeneStats({
        elasticClient: ctx.database.elastic,
        geneName: obj.gene_name,
      }),
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: datasetArgumentTypeForMethod('fetchVariantsByGene') },
        transcriptId: { type: GraphQLString },
      },
      resolve: (obj, args, ctx) => {
        if (args.transcriptId) {
          const fetchVariantsByTranscript = datasetsConfig[args.dataset].fetchVariantsByTranscript
          return fetchVariantsByTranscript(ctx, args.transcriptId, obj)
        }

        const fetchVariantsByGene = datasetsConfig[args.dataset].fetchVariantsByGene
        return fetchVariantsByGene(ctx, obj.gene_id, obj.canonical_transcript)
      },
    },
  }),
})

export default geneType

export const lookupGeneByGeneId = (db, gene_id) =>
  db.collection('genes').findOne({ gene_id })

export const lookupGeneByName = async (db, geneName) => {
  const gene = await db.collection('genes').findOne({ gene_name_upper: geneName.toUpperCase() })
  if (!gene) {
    throw Error('Gene not found')
  }
  return gene
}

export const lookupGenesByInterval = ({ mongoDatabase, xstart, xstop }) =>
  mongoDatabase.collection('genes').find({
    '$or': [
      { 'xstart': { '$gte': xstart, '$lte': xstop } },
      { 'xstop': { '$gte': xstart, '$lte': xstop } },
    ]
}).toArray()
