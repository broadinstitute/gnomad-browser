/* eslint-disable camelcase */
/* eslint-disable quote-props */
/* eslint-disable no-underscore-dangle */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  // GraphQLList,
  // GraphQLBoolean,
} from 'graphql'

import { lookupExonsByTranscriptId } from './exon'

// import vepType from './vep'
// import populationType from './populations'
// import qualityMetricsType from './qualityMetrics'
// import mnpType from './mnp'

import CATEGORY_DEFINITIONS from '../constants/variantCategoryDefinitions'

const elasticVariantType = new GraphQLObjectType({
  name: 'ElasticVariant',
  fields: () => ({
    variant_id: { type: GraphQLString },
    rsid: { type: GraphQLString },
    // chrom: { type: GraphQLString },
    pos: { type: GraphQLInt },
    xpos: { type: GraphQLFloat },
    // ref: { type: GraphQLString },
    // alt: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    allele_count: { type: GraphQLInt },
    allele_freq: { type: GraphQLFloat },
    allele_num: { type: GraphQLInt },
    // filters: { type: new GraphQLList(GraphQLString) },
    filters: { type: GraphQLString },
    hom_count: { type: GraphQLInt },
    consequence: { type: GraphQLString },
    lof: { type: GraphQLString },
  }),
})

export default elasticVariantType

export const lookupElasticVariantsByGeneId = (client, dataset, obj, ctx) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'pos',
    'xpos',
    'rsid',
    'variantId',
    'variantId',
    'lof',
    `${dataset}_AC`,
    `${dataset}_AF`,
    `${dataset}_AN`,
    `${dataset}_Hom`,
  ]

  return lookupExonsByTranscriptId(
    ctx.database.gnomad,
    obj.canonical_transcript
  ).then((exons) => {
    const padding = 75
    const regions = exons

    const filteredRegions = regions.filter(region => region.feature_type === 'CDS')

    const regionRangeQueries = filteredRegions.map(({ start, stop }) => (
      { range: { pos: { gte: start - padding, lte: stop + padding } } }))

    return new Promise((resolve, _) => {
      client.search({
        index: 'gnomad',
        type: 'variant',
        size: 5000,
        _source: fields,
        body: {
          query: {
            bool: {
              must: [
                { term: { geneId: obj.gene_id } },
                { exists: { field: `${dataset}_AC` } },
              ],
              filter: {
                bool: {
                  should: regionRangeQueries
                },
              },
            },
          },
          sort: [{ xpos: { order: 'asc' } }],
        },
      }).then((response) => {
        resolve(response.hits.hits.map((v) => {
          const elastic_variant = v._source
          return ({
            hgvsp: elastic_variant.hgvsp ? elastic_variant.hgvsp.split(':')[1] : '',
            hgvsc: elastic_variant.hgvsc ? elastic_variant.hgvsc.split(':')[1] : '',
            // chrom: elastic_variant.contig,
            // ref: elastic_variant.ref,
            // alt: elastic_variant.alt,
            consequence: elastic_variant.majorConsequence,
            pos: elastic_variant.pos,
            xpos: elastic_variant.xpos,
            rsid: elastic_variant.rsid,
            variant_id: elastic_variant.variantId,
            id: elastic_variant.variantId,
            lof: elastic_variant.lof,
            filters: 'PASS',
            allele_count: elastic_variant[`${dataset}_AC`],
            allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
            allele_num: elastic_variant[`${dataset}_AN`],
            hom_count: elastic_variant[`${dataset}_Hom`],
          })
        }))
      })
    })
  })
}

export const lookupElasticVariantsByInterval = ({ elasticClient, index, dataset, intervals }) => {
  const regionRangeQueries = intervals.map(({ xstart, xstop }) => (
    { range: { xpos: { gte: xstart, lte: xstop } } }
  ))

  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'pos',
    'xpos',
    'rsid',
    'variantId',
    'variantId',
    'lof',
    `${dataset}_AC`,
    `${dataset}_AF`,
    `${dataset}_AN`,
    `${dataset}_Hom`,
  ]

  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      type: 'variant',
      size: 100,
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { exists: { field: `${dataset}_AC` } },
            ],
            filter: {
              bool: {
                should: regionRangeQueries
              },
            },
          },
        },
        sort: [{ xpos: { order: 'asc' } }],
      },
    }).then((response) => {
      resolve(response.hits.hits.map((v) => {
        const elastic_variant = v._source
        return ({
          hgvsp: elastic_variant.hgvsp ? elastic_variant.hgvsp.split(':')[1] : '',
          hgvsc: elastic_variant.hgvsc ? elastic_variant.hgvsc.split(':')[1] : '',
          // chrom: elastic_variant.contig,
          // ref: elastic_variant.ref,
          // alt: elastic_variant.alt,
          consequence: elastic_variant.majorConsequence,
          pos: elastic_variant.pos,
          xpos: elastic_variant.xpos,
          rsid: elastic_variant.rsid,
          variant_id: elastic_variant.variantId,
          id: elastic_variant.variantId,
          lof: elastic_variant.lof,
          filters: 'PASS',
          allele_count: elastic_variant[`${dataset}_AC`],
          allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
          allele_num: elastic_variant[`${dataset}_AN`],
          hom_count: elastic_variant[`${dataset}_Hom`],
        })
      }))
    })
  })
}

export const lookupElasticVariantsInRegion = ({
  elasticClient,
  index,
  dataset,
  xstart,
  xstop,
  numberOfVariants,
  filter,
}) => {

  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'pos',
    'xpos',
    'rsid',
    'variantId',
    'variantId',
    'lof',
    `${dataset}_AC`,
    `${dataset}_AF`,
    `${dataset}_AN`,
    `${dataset}_Hom`,
  ]
  const lofs = [
    'transcript_ablation',
    'splice_acceptor_variant',
    'splice_donor_variant',
    'stop_gained',
    'frameshift_variant',
    'stop_lost',
    'start_lost',
    'inframe_insertion',
    'inframe_deletion',
  ]
  const lofQuery = lofs.map(consequence => (
    { term: { majorConsequence: consequence } }
  ))
  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      type: 'variant',
      size: numberOfVariants,
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { exists: { field: `${dataset}_AC` } },
              // { term: { majorConsequence: 'stop_gained' } },
              // ...lofQuery
            ],
            filter: {
              bool: {
                must: [
                  { range: { xpos: { gte: xstart, lte: xstop } } },
                  // { term: { majorConsequence: 'stop_gained' } },
                  // { term: { majorConsequence: 'frameshift_variant' } },
                ],
                should: lofQuery,
              },
            },
          },
        },
        sort: [{ xpos: { order: 'asc' } }],
      },
    }).then((response) => {
      resolve(response.hits.hits.map((v) => {
        const elastic_variant = v._source
        return ({
          hgvsp: elastic_variant.hgvsp ? elastic_variant.hgvsp.split(':')[1] : '',
          hgvsc: elastic_variant.hgvsc ? elastic_variant.hgvsc.split(':')[1] : '',
          // chrom: elastic_variant.contig,
          // ref: elastic_variant.ref,
          // alt: elastic_variant.alt,
          consequence: elastic_variant.majorConsequence,
          pos: elastic_variant.pos,
          xpos: elastic_variant.xpos,
          rsid: elastic_variant.rsid,
          variant_id: elastic_variant.variantId,
          id: elastic_variant.variantId,
          lof: elastic_variant.lof,
          filters: 'PASS',
          allele_count: elastic_variant[`${dataset}_AC`],
          allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
          allele_num: elastic_variant[`${dataset}_AN`],
          hom_count: elastic_variant[`${dataset}_Hom`],
        })
      }))
    })
  })
}
