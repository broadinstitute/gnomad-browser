import { fetchAllSearchResults } from '../../utilities/elasticsearch'
import { getXpos } from '../../utilities/variant'
import { lookupExonsByTranscriptId } from './exon'


const lofs = [
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
]
const lofQuery = lofs.map(consequence => (
  { term: { majorConsequence: consequence } }
))

const createConsequenceQuery = consequences => consequences.map(consequence => (
  { term: { majorConsequence: consequence } }
))

export const lookupElasticVariantsByGeneId = ({
  elasticClient,
  obj,
  ctx,
  category,
}) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'start',
    'rsid',
    'variantId',
    'lof',
    'filters',
    'AC',
    'AN',
    'AF',
    'AC_Hom',
    'AC_Hemi',
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

      // console.log('Total base pairs in variant query', totalBasePairs)

      let variantSubset = 'all'
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

      const cacheKey = `exac-variants-${obj.gene_id}-${variantSubset}`
      const start = new Date().getTime() // NOTE: timer

      return ctx.database.redis.get(cacheKey).then((reply, error) => {
        if (error) {
          reject(error)
        }
        if (reply) {
          const end = new Date().getTime()
          const time = end - start
          const variants = JSON.parse(reply)
          console.log(['variants', 'exac', obj.gene_name, variantSubset, 'cache', totalBasePairs, variants.length, time].join(','))
          return resolve(variants)
        }
        const regionRangeQueries = filteredRegions.map(({ start, stop }) => (
          { range: { start: { gte: start - padding, lte: stop + padding } } }))
        return elasticClient.search({
          index: 'exacv1',
          type: 'variant',
          size: 30000,
          _source: fields,
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
            sort: [{ start: { order: 'asc' } }],
          },
        }).then((response) => {
          const variants = response.hits.hits.map((v) => {
            const elastic_variant = v._source
            return ({
              hgvsp: elastic_variant.hgvsp ? elastic_variant.hgvsp.split(':')[1] : '',
              hgvsc: elastic_variant.hgvsc ? elastic_variant.hgvsc.split(':')[1] : '',
              consequence: elastic_variant.majorConsequence,
              pos: elastic_variant.start,
              xpos: getXpos(elastic_variant.chrom, elastic_variant.start),
              rsid: elastic_variant.rsid,
              variant_id: elastic_variant.variantId,
              id: elastic_variant.variantId,
              lof: elastic_variant.lof,
              filters: elastic_variant.filters,
              allele_count: elastic_variant['AC'],
              allele_freq: elastic_variant['AF'],
              allele_num: elastic_variant['AN'],
              hom_count: elastic_variant['AC_Hom'],
              hemi_count: elastic_variant['AC_Hemi'],
            })
          })
          return ctx.database.redis.set(
            cacheKey, JSON.stringify(variants)
          ).then(() => {
            const end = new Date().getTime()
            const time = end - start
            console.log(['variants', 'exac', obj.gene_name, variantSubset, 'lookup', totalBasePairs, variants.length, time].join(','))
            resolve(variants)
          })
        }).catch(error => console.log(error))
      }).catch(error => console.log(error))
    }).catch(error => console.log(error))
  }).catch(error => console.log(error))
}

export const lookupElasticVariantsInRegion = async ({ elasticClient, start, stop, chrom }) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'start',
    'rsid',
    'variantId',
    'lof',
    'filters',
    'AC',
    'AN',
    'AF',
    'AC_Hom',
    'AC_Hemi',
  ]

  const hits = await fetchAllSearchResults(elasticClient, {
    index: 'exacv1',
    type: 'variant',
    size: 1000,
    _source: fields,
    body: {
      query: {
        bool: {
          filter: [{ range: { start: { gte: start, lte: stop } } }, { term: { contig: chrom } }],
        },
      },
      sort: [{ start: { order: 'asc' } }],
    },
  })

  return hits.map(hit => {
    const variant = hit._source // eslint-disable-line no-underscore-dangle
    return {
      hgvsp: variant.hgvsp ? variant.hgvsp.split(':')[1] : '',
      hgvsc: variant.hgvsc ? variant.hgvsc.split(':')[1] : '',
      consequence: variant.majorConsequence,
      pos: variant.start,
      xpos: getXpos(variant.chrom, variant.start),
      rsid: variant.rsid,
      variant_id: variant.variantId,
      id: variant.variantId,
      lof: variant.lof,
      filters: variant.filters,
      allele_count: variant.AC,
      allele_freq: variant.AF,
      allele_num: variant.AN,
      hom_count: variant.AC_Hom,
      hemi_count: variant.AC_Hemi,
    }
  })
}
