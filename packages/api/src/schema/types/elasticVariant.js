/* eslint-disable camelcase */
/* eslint-disable quote-props */
/* eslint-disable no-underscore-dangle */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
  // GraphQLBoolean,
} from 'graphql'

import { lookupExonsByTranscriptId } from './exon'

// import vepType from './vep'
// import populationType from './populations'
// import qualityMetricsType from './qualityMetrics'
// import mnpType from './mnp'

import CATEGORY_DEFINITIONS from '../constants/variantCategoryDefinitions'

const lofs = [
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
]
const createConsequenceQuery = consequences => consequences.map(consequence => (
  { term: { majorConsequence: consequence } }
))
//
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
    filters: { type: new GraphQLList(GraphQLString) },
    // filters: { type: GraphQLString },
    hom_count: { type: GraphQLInt },
    consequence: { type: GraphQLString },
    lof: { type: GraphQLString },
  }),
})

export default elasticVariantType

export const lookupElasticVariantsByGeneId = ({
  elasticClient,
  dataset,
  obj,
  ctx,
  category,
}) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'pos',
    'xpos',
    'rsid',
    'variantId',
    'lof',
    `${dataset}_filters`,
    `${dataset}_AC`,
    `${dataset}_AF`,
    `${dataset}_AN`,
    `${dataset}_Hom`,
  ]

  return new Promise((resolve, reject) => {
    return lookupExonsByTranscriptId(
      ctx.database.gnomad,
      obj.canonical_transcript
    ).then((exons) => {
      const overrideCategory = true
      const padding = 75
      const regions = exons

      const filteredRegions = regions.filter(region => region.feature_type === 'CDS')

      const totalBasePairs = filteredRegions.reduce((acc, { start, stop }) =>
        (acc + ((stop - start) + (padding * 2))), 0)

      console.log('Total base pairs in variant query', totalBasePairs)

      let variantSubset
      if (category && !overrideCategory) {
        variantSubset = category
      } else if (totalBasePairs > 40000) {
        variantSubset = 'lof'
      } else if (totalBasePairs > 15000) {
        variantSubset = 'lofAndMissense'
      } else {
        variantSubset = 'all'
      }

      const createVariantSubsetQuery = (variantSubset) => {
        switch (variantSubset) {
          case 'lof':
            return createConsequenceQuery(lofs)
          case 'lofAndMissense':
            return createConsequenceQuery([...lofs, 'missense_variant'])
          default:
            return []
        }
      }
      const variantQuery = createVariantSubsetQuery(variantSubset)

      const cacheKey = `${dataset}-variants-${obj.gene_id}-${variantSubset}`

      return ctx.database.redis.get(cacheKey).then((reply, error) => {
        if (error) {
          reject(error)
        }
        if (reply) {
          return resolve(JSON.parse(reply))
        }
        const regionRangeQueries = filteredRegions.map(({ start, stop }) => (
          { range: { pos: { gte: start - padding, lte: stop + padding } } }))
        return elasticClient.search({
          index: 'gnomad',
          type: 'variant',
          size: 20000,
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
                    must: [
                      {
                        bool: {
                          should: regionRangeQueries,
                        }
                      },
                      {
                        bool: {
                          should: variantQuery,
                        }
                      },
                    ]
                  },
                },
              },
            },
            sort: [{ xpos: { order: 'asc' } }],
          },
        }).then((response) => {
          const variants = response.hits.hits.map((v) => {
            const elastic_variant = v._source
            return ({
              hgvsp: elastic_variant.hgvsp ? elastic_variant.hgvsp.split(':')[1] : '',
              hgvsc: elastic_variant.hgvsc ? elastic_variant.hgvsc.split(':')[1] : '',
              consequence: elastic_variant.majorConsequence,
              pos: elastic_variant.pos,
              xpos: elastic_variant.xpos,
              rsid: elastic_variant.rsid,
              variant_id: elastic_variant.variantId,
              id: elastic_variant.variantId,
              lof: elastic_variant.lof,
              filters: elastic_variant[`${dataset}_filters`],
              allele_count: elastic_variant[`${dataset}_AC`],
              allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
              allele_num: elastic_variant[`${dataset}_AN`],
              hom_count: elastic_variant[`${dataset}_Hom`],
            })
          })
          return ctx.database.redis.set(
            cacheKey, JSON.stringify(variants)
          ).then((response) => {
            resolve(variants)
          })
        }).catch(error => console.log(error))
      }).catch(error => console.log(error))
    }).catch(error => console.log(error))
  }).catch(error => console.log(error))
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
  chrom,
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
    'lof',
    `${dataset}_filters`,
    `${dataset}_AC`,
    `${dataset}_AF`,
    `${dataset}_AN`,
    `${dataset}_Hom`,
  ]


  const lofQuery = createConsequenceQuery(lofs)
  const missenseQuery = createConsequenceQuery([...lofs, 'missense_variant'])

  let consequenceQuery = createConsequenceQuery([])

  if ((xstop - xstart) > 50000) {
    consequenceQuery = missenseQuery
  }
  if ((xstop - xstart) > 200000) {
    consequenceQuery = lofQuery
  }

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
            ],
            filter: {
              bool: {
                must: [
                  { range: { xpos: { gte: xstart, lte: xstop } } },
                ],
                should: consequenceQuery,
              },
            },
          },
        },
        sort: [{ xpos: { order: 'asc' } }],
      },
    }).then((response) => {
      resolve(response.hits.hits.map((v) => {
        const elastic_variant = v._source
        // console.log(elastic_variant[`${dataset}_filters`])
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
          filters: elastic_variant[`${dataset}_filters`],
          allele_count: elastic_variant[`${dataset}_AC`],
          allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
          allele_num: elastic_variant[`${dataset}_AN`],
          hom_count: elastic_variant[`${dataset}_Hom`],
        })
      }))
    })
  })
}
