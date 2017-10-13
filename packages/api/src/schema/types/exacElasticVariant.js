/* eslint-disable camelcase */
/* eslint-disable quote-props */
/* eslint-disable no-underscore-dangle */
/* eslint-disable dot-notation */

import { getXpos } from '@broad/utilities/lib/variant'
import { lookupExonsByTranscriptId } from './exon'
import CATEGORY_DEFINITIONS from '../constants/variantCategoryDefinitions'

export const lookupElasticVariantsByGeneId = (client, obj, ctx) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'start',
    'rsid',
    'variantId',
    'lof',
    'AC',
    'AN',
    'AF',
    'AC_Hom',
  ]

  return lookupExonsByTranscriptId(
    ctx.database.gnomad,
    obj.canonical_transcript
  ).then((exons) => {
    const padding = 75
    const regions = exons

    const filteredRegions = regions.filter(region => region.feature_type === 'CDS')

    const regionRangeQueries = filteredRegions.map(({ start, stop }) => (
      { range: { start: { gte: start - padding, lte: stop + padding } } }))

    return new Promise((resolve, _) => {
      client.search({
        index: 'exacv1',
        type: 'variant',
        size: 5000,
        _source: fields,
        body: {
          query: {
            bool: {
              must: [
                { term: { geneId: obj.gene_id } },
              ],
              filter: {
                bool: {
                  should: regionRangeQueries
                },
              },
            },
          },
          sort: [{ start: { order: 'asc' } }],
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
            pos: elastic_variant.start,
            xpos: getXpos(elastic_variant.chrom, elastic_variant.start),
            rsid: elastic_variant.rsid,
            variant_id: elastic_variant.variantId,
            id: elastic_variant.variantId,
            lof: elastic_variant.lof,
            filters: 'PASS',
            allele_count: elastic_variant['AC'],
            allele_freq: elastic_variant['AF'],
            allele_num: elastic_variant['AN'],
            hom_count: elastic_variant['AC_Hom'],
          })
        }))
      })
    })
  })
}

export const lookupElasticVariantsInRegion = ({
  elasticClient,
  numberOfVariants,
  filter,
  start,
  stop,
}) => {
  const fields = [
    'hgvsp',
    'hgvsc',
    'majorConsequence',
    'start',
    'rsid',
    'variantId',
    'lof',
    'AC',
    'AN',
    'AF',
    'AC_Hom',
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
      index: 'exacv1',
      type: 'variant',
      size: numberOfVariants,
      _source: fields,
      body: {
        query: {
          bool: {
            filter: {
              bool: {
                must: [
                  { range: { start: { gte: start, lte: stop } } },
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
          pos: elastic_variant.start,
          xpos: getXpos(elastic_variant.chrom, elastic_variant.start),
          rsid: elastic_variant.rsid,
          variant_id: elastic_variant.variantId,
          id: elastic_variant.variantId,
          lof: elastic_variant.lof,
          filters: 'PASS',
          allele_count: elastic_variant['AC'],
          allele_freq: elastic_variant['AF'],
          allele_num: elastic_variant['AN'],
          hom_count: elastic_variant['AC_Hom'],
        })
      }))
    })
  })
}
