/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
} from 'graphql'

import coverageType, {
  lookupCoverageByStartStop,
  lookupCoverageBuckets,
  lookupCoverageByIntervals,
  lookupCoverageByIntervalsWithBuckets,
} from './coverage'
import variantType, {
  lookupVariantsByGeneId,
} from './variant'
import transcriptType, { lookupTranscriptsByTranscriptId, lookupAllTranscriptsByGeneId } from './transcript'
import exonType, { lookupExonsByGeneId } from './exon'
import constraintType, { lookUpConstraintByTranscriptId } from './constraint'
import cnvsGene, { lookUpCnvsGeneByGeneName } from './cnvs_genes'
import cnvsExons, { lookUpCnvsExonsByTranscriptId } from './cnvs_exons'

import {
  schzGeneResult,
  schizophreniaRareVariants,
  schizophreniaGwasVariants,
} from './schzvariant'

import minimalVariantType, { lookupMinimalVariants } from './minimalVariant'
import elasticVariantType, { lookupElasticVariantsByGeneId } from './elasticVariant'
import * as fromExacVariant from './exacElasticVariant'
import clinvarType, { lookupClinvarVariantsByGeneName } from './clinvar'

import * as fromRegionalConstraint from './regionalConstraint'

const geneType = new GraphQLObjectType({
  name: 'Gene',
  fields: () => ({
    _id: { type: GraphQLString },
    omim_description: { type: GraphQLString },
    stop: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    omim_accession: { type: GraphQLString },
    chrom: { type: GraphQLString },
    strand: { type: GraphQLString },
    full_gene_name: { type: GraphQLString },
    gene_name_upper: { type: GraphQLString },
    other_names: { type: new GraphQLList(GraphQLString) },
    canonical_transcript: { type: GraphQLString },
    start: { type: GraphQLInt },
    xstop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    gene_name: { type: GraphQLString },
    // exome_coverage: {
    //   type: new GraphQLList(coverageType),
    //   resolve: (obj, args, ctx) =>
    //     lookupCoverageByStartStop(ctx.database.gnomad, 'exome_coverage', obj.xstart, obj.xstop),
    // },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        // if ((obj.stop - obj.start) > 1000) {
        //   return lookupCoverageBuckets({
        //     elasticClient: ctx.database.elastic,
        //     index: 'genome_coverage',
        //     intervals: [{ start: obj.start, stop: obj.stop }],
        //     chrom: obj.chrom,
        //   })
        // }
        return lookupCoverageByIntervalsWithBuckets({
          elasticClient: ctx.database.elastic,
          index: 'genome_coverage',
          intervals: [{ start: obj.start, stop: obj.stop }],
          chrom: obj.chrom,
        })
      }
    },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        if ((obj.stop - obj.start) > 10000) {
          return lookupCoverageBuckets({
            elasticClient: ctx.database.elastic,
            index: 'genome_coverage',
            intervals: [{ start: obj.start, stop: obj.stop }],
            chrom: obj.chrom,
          })
        }
        return lookupCoverageByIntervals({
          elasticClient: ctx.database.elastic,
          index: 'exome_coverage',
          intervals: [{ start: obj.start, stop: obj.stop }],
          chrom: obj.chrom,
        })
      }
    },
    // exacv1_coverage: {
    //   type: new GraphQLList(coverageType),
    //   resolve: (obj, args, ctx) =>
    //     lookupCoverageByStartStop(ctx.database.exacv1, 'base_coverage', obj.xstart, obj.xstop),
    // },
    exome_variants: {
      type: new GraphQLList(variantType),
      args: { consequence: { type: GraphQLString } },
      resolve: (obj, args, ctx) =>
          lookupVariantsByGeneId(ctx.database.gnomad, 'exome_variants', obj.gene_id, args.consequence),
    },
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
      type: new GraphQLList(clinvarType),
      resolve: (obj, args, ctx) =>
        lookupClinvarVariantsByGeneName(ctx.database.elastic, 'clinvar', obj.gene_name),
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
    exacv1_cnvs_exons: {
      type: new GraphQLList(cnvsExons),
      resolve: (obj, args, ctx) =>
        lookUpCnvsExonsByTranscriptId(ctx.database.exacv1, obj.canonical_transcript),
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
