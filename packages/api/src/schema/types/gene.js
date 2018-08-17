/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
} from 'graphql'

import {
  ClinvarVariantType,
  fetchClinvarVariantsInGene,
  fetchClinvarVariantsInTranscript,
} from '../datasets/clinvar'

import transcriptType, { lookupTranscriptsByTranscriptId, lookupAllTranscriptsByGeneId } from './transcript'
import exonType, { lookupExonsByGeneId } from './exon'
import constraintType, { lookUpConstraintByTranscriptId } from './constraint'

import {
  schzGeneResult,
  schizophreniaRareVariants,
  schizophreniaGwasVariants,
} from './schzvariant'

import elasticVariantType, { lookupElasticVariantsByGeneId } from './elasticVariant'
import * as fromExacVariant from './exacElasticVariant'

import * as fromRegionalConstraint from './regionalConstraint'

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
    gnomadExomeVariants: {
      type: new GraphQLList(elasticVariantType),
      args: {
        transcriptId: { type: GraphQLString },
        variantIdListQuery: {
          type: new GraphQLList(GraphQLString),
          description: 'Give a list of variant ids.'
        },
        category: {
          type: GraphQLString,
          description: 'Return variants by consequence category: all, lof, or lofAndMissense',
        },
      },
      resolve: (obj, args, ctx) => {
        return lookupElasticVariantsByGeneId({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_exomes_202_37',
          obj,
          ctx,
          transcriptQuery: args.transcriptId,
          category: args.category,
          variantIdListQuery: args.variantIdListQuery,
        })
      }
        ,
    },
    gnomadGenomeVariants: {
      type: new GraphQLList(elasticVariantType),
      args: {
        transcriptId: { type: GraphQLString },
        category: {
          type: GraphQLString,
          description: 'Return variants by consequence category: all, lof, or lofAndMissense',
        },
      },
      resolve: (obj, args, ctx) =>
        lookupElasticVariantsByGeneId({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_genomes_202_37',
          obj,
          ctx,
          transcriptQuery: args.transcriptId,
          category: args.category,
        }),
    },
    exacVariants: {
      type: new GraphQLList(elasticVariantType),
      args: {
        category: {
          type: GraphQLString,
          description: 'Return variants by consequence category: all, lof, or lofAndMissense',
        },
      },
      resolve: (obj, args, ctx) =>
        fromExacVariant.lookupElasticVariantsByGeneId({
          elasticClient: ctx.database.elastic,
          obj,
          ctx,
          category: args.category,
        }),
    },
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
    schzGeneResult,
    schizophreniaRareVariants,
    schizophreniaGwasVariants,
  }),
})

export default geneType

export const lookupGeneByGeneId = (db, gene_id) =>
  db.collection('genes').findOne({ gene_id })

export const lookupGeneByName = (db, gene_name) => {
  return new Promise((resolve, reject) => {
    db.collection('genes').findOne({ gene_name })
      .then((data) => {
        if (!data) {
          reject('Gene not found.')
        }
        resolve(data)
      })
      .catch(error => reject(error))
  })
}

export const lookupGenesByInterval = ({ mongoDatabase, xstart, xstop }) =>
  mongoDatabase.collection('genes').find({
    '$or': [
      { 'xstart': { '$gte': xstart, '$lte': xstop } },
      { 'xstop': { '$gte': xstart, '$lte': xstop } },
    ]
}).toArray()
