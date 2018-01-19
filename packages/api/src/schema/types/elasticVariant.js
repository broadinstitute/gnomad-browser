/* eslint-disable camelcase */
/* eslint-disable quote-props */
/* eslint-disable no-underscore-dangle */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql'

import populationType from './populations'
import qualityMetricsType from './qualityMetrics'
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

const populations = {
  NFE: 'european_non_finnish',
  EAS: 'east_asian',
  OTH: 'other',
  AFR: 'african',
  AMR: 'latino',
  SAS: 'south_asian',
  FIN: 'european_finnish',
  ASJ: 'ashkenazi_jewish',
}

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
    hom_count: { type: GraphQLInt },
    hemi_count: { type: GraphQLInt },
    popmax: { type: GraphQLString },
    popmax_ac: { type: GraphQLInt },
    popmax_an: { type: GraphQLInt },
    popmax_af: { type: GraphQLFloat },
    lcr: { type: GraphQLBoolean },
    segdup: { type: GraphQLBoolean },
    filters: { type: new GraphQLList(GraphQLString) },
    consequence: { type: GraphQLString },
    lof: { type: GraphQLString },
    pop_acs: { type: populationType },
    pop_ans: { type: populationType },
    pop_homs: { type: populationType },
    pop_hemi: { type: populationType },
    quality_metrics: { type: qualityMetricsType },
    originalAltAlleles: { type: new GraphQLList(GraphQLString) },
    transcriptIds: { type: new GraphQLList(GraphQLString) },
    exon: { type: GraphQLString },
    fitted_score: { type: GraphQLFloat },
    sorted_transcript_consequences: { type: new GraphQLList(new GraphQLObjectType({
      name: 'SortedTranscriptConsequences',
      fields: () => ({
        amino_acids: { type: GraphQLString },
        biotype: { type: GraphQLString },
        canonical: { type: GraphQLInt },
        cdna_start: { type: GraphQLInt },
        cdna_end: { type: GraphQLInt },
        codons: { type: GraphQLString },
        consequence_terms: { type: new GraphQLList(GraphQLString) },
        distance: { type: GraphQLInt },
        exon: { type: GraphQLString },
        gene_id: { type: GraphQLString },
        gene_symbol: { type: GraphQLString },
        gene_symbol_source: { type: GraphQLString },
        hgvsc: { type: GraphQLString },
        hgvsp: { type: GraphQLString },
        lof: { type: GraphQLString },
        lof_flags: { type: GraphQLString },
        lof_filter: { type: GraphQLString },
        lof_info: { type: GraphQLString },
        protein_id: { type: GraphQLString },
        transcript_id: { type: GraphQLString },
        hgnc_id: { type: GraphQLInt },
        domains: { type: GraphQLString },
        hgvs: { type: GraphQLString },
        major_consequence: { type: GraphQLString },
        major_consequence_rank: { type: GraphQLInt },
        category: { type: GraphQLString },
      })
    })) }
  }),
})

export default elasticVariantType

export const lookupElasticVariantsByGeneId = ({
  elasticClient,
  index,
  obj,
  ctx,
  transcriptQuery,
  // category,
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
    'lcr',
    'segdup',
    'filters',
    'AC',
    'AF',
    'AN',
    'Hom',
    'Hemi',
    'POPMAX',
    'AC_POPMAX',
    'AN_POPMAX',
    'AF_POPMAX',
    'fitted_score',
    'exon',
    'originalAltAllele',
    'transcriptIds',
    'FS',
    'InbreedingCoeff',
    'VQSLOD',
    'BaseQRankSum',
    'MQ',
    'MQRankSum',
    'ClippingRankSum',
    'ReadPosRankSum',
    'DP',
    'QD',
    'AS_RF',
    'DREF_MEDIAN',
    'DP_MEDIAN',
    'GQ_MEDIAN',
    'AB_MEDIAN',
    'GQ_HIST_ALT',
    'DP_HIST_ALT',
    'AB_HIST_ALT',
    'GQ_HIST_ALL',
    'DP_HIST_ALL',
    'AB_HIST_ALL',
    'sortedTranscriptConsequences',
  ]

  const cachedFields = [
    'variantId',
    'rsid',
    'pos',
    'xpos',
    'hgvsc',
    'hgvsp',
    'AC',
    'AF',
    'AN',
    'Hemi',
    'filters',
    'Hom',
    'majorConsequence',
    'lof',
    'lcr',
    'segdup',
  ]

  fields.push(Object.keys(populations).map(population => `AC_${population}`))
  fields.push(Object.keys(populations).map(population => `AN_${population}`))
  fields.push(Object.keys(populations).map(population => `Hom_${population}`))
  fields.push(Object.keys(populations).map(population => `Hemi_${population}`))

  const currentTranscript = transcriptQuery !== 'undefined' ? transcriptQuery : obj.canonical_transcript

  const cachedLookupRequested = true

  return new Promise((resolve, reject) => {
    return lookupExonsByTranscriptId(
      ctx.database.gnomad,
      currentTranscript
    ).then((exons) => {
      const overrideCategory = false
      const padding = 75
      const regions = exons

      const filteredRegions = regions.filter(region => region.feature_type === 'CDS')

      const totalBasePairs = filteredRegions.reduce((acc, { start, stop }) =>
        (acc + ((stop - start) + (padding * 2))), 0)

      // console.log('Total base pairs in variant query', totalBasePairs)

      const variantSubset = 'all'
      // if (category && !overrideCategory) {
      //   variantSubset = category
      // } else if (totalBasePairs > 40000) {
      //   variantSubset = 'lof'
      // } else if (totalBasePairs > 15000) {
      //   variantSubset = 'lofAndMissense'
      // } else {
      //   variantSubset = 'all'
      // }

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

      const cacheKey = `${index}-variants-${obj.gene_id}-${variantSubset}`
      const start = new Date().getTime() // NOTE: timer
      return ctx.database.redis.get(cacheKey).then((reply, error) => {
        if (error) {
          reject(error)
        }
        if (reply) {
          const end = new Date().getTime()
          const time = end - start
          let variants = JSON.parse(reply)

          if (!(transcriptQuery !== 'undefined')) {
            console.log(['variants', index, obj.gene_name, variantSubset, 'cache', totalBasePairs, variants.length, time].join(','))
            resolve(variants)
            return
          }

          variants = variants
            .filter((variant) => {
              let isInTranscript
              filteredRegions.forEach((region) => {
                if (region.start - padding < variant.pos && variant.pos < region.stop + padding) {
                  isInTranscript = true
                }
              })
              return isInTranscript
            })

          const variantIds = variants.map(v => v.variant_id)

          elasticClient.search({
            index,
            type: 'variant',
            size: 40000,
            _source: ['sortedTranscriptConsequences', 'variantId'],
            body: {
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: { variantId: variantIds },
                        },

                      ]
                    },
                  },
                },
              },
              sort: [{ xpos: { order: 'asc' } }],
            },
          }).then((response) => {
            const variantTranscriptConsequences = response.hits.hits.map((hit) => {
              const transcripts = JSON.parse(hit._source.sortedTranscriptConsequences)
              const transcriptAnnotation = transcripts.find(transcript => transcript.transcript_id === transcriptQuery)
              const {
                major_consequence,
                hgvsc,
                hgvsp,
                lof,
              } = transcriptAnnotation

              return {
                variant_id: hit._source.variantId,
                consequence: major_consequence,
                hgvsc: hgvsc ? hgvsc.split(':')[1] : '',
                hgvsp: hgvsp ? hgvsp.split(':')[1] : '',
                lof,
              }
            })

            variants = variants.map((v) => {
              const {
                consequence,
                hgvsc,
                hgvsp,
                lof,
              } = variantTranscriptConsequences.find(variant => variant.variant_id === v.variant_id)
              return {
                ...v,
                consequence,
                hgvsc,
                hgvsp,
                lof,
              }
            })

            console.log(['variants', index, obj.gene_name, variantSubset, 'cache', totalBasePairs, variants.length, time].join(','))
            return resolve(variants)
            }).catch(error => console.log(error))

        } else {
          const regionRangeQueries = filteredRegions.map(({ start, stop }) => (
            { range: { pos: { gte: start - padding, lte: stop + padding } } }))

          return elasticClient.search({
            index,
            type: 'variant',
            size: 40000,
            _source: cachedLookupRequested ? cachedFields : fields,
            body: {
              query: {
                bool: {
                  must: [
                    { term: { geneId: obj.gene_id } },
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
            if (cachedLookupRequested) {
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
                  filters: elastic_variant.filters,
                  allele_count: elastic_variant.AC,
                  allele_freq: elastic_variant.AF ? elastic_variant.AF : 0,
                  allele_num: elastic_variant.AN,
                  hom_count: elastic_variant.Hom,
                  hemi_count: elastic_variant.Hemi,
                  lcr: elastic_variant.lcr,
                  segdup: elastic_variant.segdup,
                })
              })

              return ctx.database.redis.set(
                cacheKey, JSON.stringify(variants)
              ).then(() => {
                const end = new Date().getTime()
                const time = end - start
                console.log(['variants', index, obj.gene_name, variantSubset, 'lookup', totalBasePairs, variants.length, time].join(','))
                resolve(variants)
                return
              })
            } else {
              const variants = response.hits.hits.map((v) => {
                const elastic_variant = v._source
                const sortedTranscriptConsequences = JSON.parse(
                  elastic_variant.sortedTranscriptConsequences
                )

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
                  filters: elastic_variant.filters,
                  allele_count: elastic_variant.AC,
                  allele_freq: elastic_variant.AF ? elastic_variant.AF : 0,
                  allele_num: elastic_variant.AN,
                  popmax: elastic_variant.POPMAX,
                  popmax_ac: elastic_variant.AC_POPMAX,
                  popmax_an: elastic_variant.AN_POPMAX,
                  popmax_af: elastic_variant.AF_POPMAX,
                  hom_count: elastic_variant.Hom,
                  hemi_count: elastic_variant.Hemi,
                  lcr: elastic_variant.lcr,
                  segdup: elastic_variant.segdup,
                  sorted_transcript_consequences: sortedTranscriptConsequences,
                  quality_metrics: {
                    FS: elastic_variant.FS,
                    MQRankSum: elastic_variant.MQRankSum,
                    InbreedingCoeff: elastic_variant.InbreedingCoeff,
                    VQSLOD: elastic_variant.VQSLOD,
                    BaseQRankSum: elastic_variant.BaseQRankSum,
                    MQ: elastic_variant.MQ,
                    ClippingRankSum: elastic_variant.ClippingRankSum,
                    ReadPosRankSum: elastic_variant.ReadPosRankSum,
                    DP: elastic_variant.DP,
                    QD: elastic_variant.QD,
                    AS_RF: elastic_variant.AS_RF,
                    DREF_MEDIAN: elastic_variant.DREF_MEDIAN,
                    DP_MEDIAN: elastic_variant.DP_MEDIAN,
                    GQ_MEDIAN: elastic_variant.GQ_MEDIAN,
                    AB_MEDIAN: elastic_variant.AB_MEDIAN,
                    GQ_HIST_ALT: elastic_variant.GQ_HIST_ALT,
                    DP_HIST_ALT: elastic_variant.DP_HIST_ALT,
                    AB_HIST_ALT: elastic_variant.AB_HIST_ALT,
                    GQ_HIST_ALL: elastic_variant.GQ_HIST_ALL,
                    DP_HIST_ALL: elastic_variant.DP_HIST_ALL,
                    AB_HIST_ALL: elastic_variant.AB_HIST_ALL,
                  },
                  pop_acs: Object.keys(populations).reduce((acc, key) => (
                    { ...acc, [populations[key]]: elastic_variant[`AC_${key}`] }
                  ), {}),
                  pop_ans: Object.keys(populations).reduce((acc, key) => (
                    { ...acc, [populations[key]]: elastic_variant[`AN_${key}`] }
                  ), {}),
                  pop_homs: Object.keys(populations).reduce((acc, key) => (
                    { ...acc, [populations[key]]: elastic_variant[`Hom_${key}`] }
                  ), {}),
                  pop_hemi: Object.keys(populations).reduce((acc, key) => (
                    { ...acc, [populations[key]]: elastic_variant[`Hemi_${key}`] }
                  ), {}),
                })
              })
              const end = new Date().getTime()
              const time = end - start
              console.log(['variants', index, obj.gene_name, variantSubset, 'full_lookup', totalBasePairs, variants.length, time].join(','))
              resolve(variants)
            }
          }).catch(error => console.log(error))
        }
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
    'lcr',
    'segdup',
    'AC',
    'AF',
    'AN',
    'Hom',
  ]

  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      type: 'variant',
      size: 5000,
      _source: fields,
      body: {
        query: {
          bool: {
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
          consequence: elastic_variant.majorConsequence,
          pos: elastic_variant.pos,
          xpos: elastic_variant.xpos,
          rsid: elastic_variant.rsid,
          variant_id: elastic_variant.variantId,
          id: elastic_variant.variantId,
          lof: elastic_variant.lof,
          filters: elastic_variant.filters,
          allele_count: elastic_variant.AC,
          allele_freq: elastic_variant.AF ? elastic_variant.AF : 0,
          allele_num: elastic_variant.AN,
          hom_count: elastic_variant.Hom,
          lcr: elastic_variant.lcr,
          segdup: elastic_variant.segdup,
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
    'lcr',
    'segdup',
    'filters',
    'AC',
    'AF',
    'AN',
    'Hom',
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
          filters: elastic_variant.filters,
          allele_count: elastic_variant.AC,
          allele_freq: elastic_variant.AF ? elastic_variant.AF : 0,
          allele_num: elastic_variant.AN,
          hom_count: elastic_variant.Hom,
          lcr: elastic_variant.lcr,
          segdup: elastic_variant.segdup,
        })
      }))
    })
  })
}

export const lookupElasticVariantByList = ({
  elasticClient,
  index,
  variantIdListQuery,
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
    'lcr',
    'segdup',
    'filters',
    'AC',
    'AF',
    'AN',
    'Hom',
    'Hemi',
    'POPMAX',
    'AC_POPMAX',
    'AN_POPMAX',
    'AF_POPMAX',
    'fitted_score',
    'exon',
    'originalAltAllele',
    'transcriptIds',
    'FS',
    'InbreedingCoeff',
    'VQSLOD',
    'BaseQRankSum',
    'MQ',
    'MQRankSum',
    'ClippingRankSum',
    'ReadPosRankSum',
    'DP',
    'QD',
    'AS_RF',
    'DREF_MEDIAN',
    'DP_MEDIAN',
    'GQ_MEDIAN',
    'AB_MEDIAN',
    'GQ_HIST_ALT',
    'DP_HIST_ALT',
    'AB_HIST_ALT',
    'GQ_HIST_ALL',
    'DP_HIST_ALL',
    'AB_HIST_ALL',
    'sortedTranscriptConsequences',
  ]

  fields.push(Object.keys(populations).map(population => `AC_${population}`))
  fields.push(Object.keys(populations).map(population => `AN_${population}`))
  fields.push(Object.keys(populations).map(population => `Hom_${population}`))
  fields.push(Object.keys(populations).map(population => `Hemi_${population}`))

  return elasticClient.search({
    index: index,
    type: 'variant',
    size: 10000,
    _source: fields,
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              must: [
                {
                  terms: { variantId: variantIdListQuery },
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
        filters: elastic_variant.filters,
        allele_count: elastic_variant.AC,
        allele_freq: elastic_variant.AF ? elastic_variant.AF : 0,
        allele_num: elastic_variant.AN,
        popmax: elastic_variant.POPMAX,
        popmax_ac: elastic_variant.AC_POPMAX,
        popmax_an: elastic_variant.AN_POPMAX,
        popmax_af: elastic_variant.AF_POPMAX,
        hom_count: elastic_variant.Hom,
        hemi_count: elastic_variant.Hemi,
        lcr: elastic_variant.lcr,
        segdup: elastic_variant.segdup,
        sorted_transcript_consequences: JSON.parse(elastic_variant.sortedTranscriptConsequences),
        quality_metrics: {
          FS: elastic_variant.FS,
          MQRankSum: elastic_variant.MQRankSum,
          InbreedingCoeff: elastic_variant.InbreedingCoeff,
          VQSLOD: elastic_variant.VQSLOD,
          BaseQRankSum: elastic_variant.BaseQRankSum,
          MQ: elastic_variant.MQ,
          ClippingRankSum: elastic_variant.ClippingRankSum,
          ReadPosRankSum: elastic_variant.ReadPosRankSum,
          DP: elastic_variant.DP,
          QD: elastic_variant.QD,
          AS_RF: elastic_variant.AS_RF,
          DREF_MEDIAN: elastic_variant.DREF_MEDIAN,
          DP_MEDIAN: elastic_variant.DP_MEDIAN,
          GQ_MEDIAN: elastic_variant.GQ_MEDIAN,
          AB_MEDIAN: elastic_variant.AB_MEDIAN,
          GQ_HIST_ALT: elastic_variant.GQ_HIST_ALT,
          DP_HIST_ALT: elastic_variant.DP_HIST_ALT,
          AB_HIST_ALT: elastic_variant.AB_HIST_ALT,
          GQ_HIST_ALL: elastic_variant.GQ_HIST_ALL,
          DP_HIST_ALL: elastic_variant.DP_HIST_ALL,
          AB_HIST_ALL: elastic_variant.AB_HIST_ALL,
        },
        pop_acs: Object.keys(populations).reduce((acc, key) => (
          { ...acc, [populations[key]]: elastic_variant[`AC_${key}`] }
        ), {}),
        pop_ans: Object.keys(populations).reduce((acc, key) => (
          { ...acc, [populations[key]]: elastic_variant[`AN_${key}`] }
        ), {}),
        pop_homs: Object.keys(populations).reduce((acc, key) => (
          { ...acc, [populations[key]]: elastic_variant[`Hom_${key}`] }
        ), {}),
        pop_hemi: Object.keys(populations).reduce((acc, key) => (
          { ...acc, [populations[key]]: elastic_variant[`Hemi_${key}`] }
        ), {}),
      })
    })
    return variants
    }).catch(error => console.log(error))
}

export const gnomadVariants = {
  type: new GraphQLList(elasticVariantType),
  args: {
    dataset: {
      type: GraphQLString,
      description: 'gnomad_exomes, gnomad_genomes'
    },
    variantIdList: {
      type: new GraphQLList(GraphQLString),
      description: 'Give a list of variant ids.'
    },
    category: {
      type: GraphQLString,
      description: 'Return variants by consequence category: all, lof, or lofAndMissense',
    },
  },
  resolve: (obj, args, ctx) => {
    return lookupElasticVariantByList({
      elasticClient: ctx.database.elastic,
      index: args.dataset,
      variantIdListQuery: args.variantIdList,
    })
  }
}
