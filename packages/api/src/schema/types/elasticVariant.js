/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql'

import vepType from './vep'
import populationType from './populations'
import qualityMetricsType from './qualityMetrics'
import mnpType from './mnp'

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

const getXpos = (chr, pos) => {
  const autosomes = Array.from(new Array(22), (x, i) => `chr${i + 1}`)
  const chromosomes = [...autosomes, 'chrX', 'chrY', 'chrM']
  const chromosomeCodes = chromosomes.reduce((acc, chrom, i) => {
    return { ...acc, [chrom]: i + 1 }
  }, {})
  const chrStart = chromosomeCodes[`chr${chr}`] * 1e9
  const xpos = chrStart + Number(pos)
  return xpos
}

export const lookupVariant = (db, collection, variant_id) => {
  const [chrom, pos, ref, alt] = variant_id.split('-')
  const xpos = getXpos(chrom, pos)
  return db.collection(collection).findOne({ xpos, ref, alt })
}

export const lookupVariantRsid = (db, collection, rsid) => {
  return db.collection(collection).findOne({ rsid })
}

export const lookupElasticVariantsByGeneId = (client, dataset, gene_id) => {
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
  return new Promise((resolve, reject) => {
    client.search({
      index: 'gnomad',
      type: 'variant',
      size: 5000,
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { term: { geneId: gene_id } },
              { exists: { field: `${dataset}_AC` } },
            ],
          },
        },
        sort: [ { xpos: { order: "asc" }}],
      },
    }).then(response => {
      resolve(response.hits.hits.map(v => {
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
          filters: "PASS",
          allele_count: elastic_variant[`${dataset}_AC`],
          allele_freq: elastic_variant[`${dataset}_AF`] ? elastic_variant[`${dataset}_AF`] : 0,
          allele_num: elastic_variant[`${dataset}_AN`],
          hom_count: elastic_variant[`${dataset}_Hom`],
        })
      }))
    })
  })
}

export const lookupVariantsByTranscriptId = (db, collection, transcript_id) =>
  db.collection(collection).find({ transcripts: transcript_id }).toArray()

export const lookupVariantsByStartStop = (db, collection, xstart, xstop) =>
  db.collection(collection).find(
    { xpos: { '$gte': Number(xstart), '$lte': Number(xstop) } }
  ).toArray()

export const variantResolver = (obj, args, ctx) => {  // eslint-disable-line
  let database
  let collection
  if (args.source === 'genome' || args.source === 'exome') {
    database = ctx.database.gnomad
    collection = args.source === 'genome' ? 'genome_variants' : 'exome_variants'
  } else if (args.source === 'exacv1') {
    database = ctx.database.exacv1
    collection = 'variants'
  }
  if (args.id) {
    return lookupVariant(database, collection, args.id)
  } else if (args.rsid) {
    return lookupVariantRsid(database, collection, args.rsid)
  }
}

