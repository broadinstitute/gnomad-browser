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

const variantType = new GraphQLObjectType({
  name: 'Variant',
  fields: () => ({
    _id: { type: GraphQLString },
    // CANONICAL: { type: GraphQLString }, // TODO: add this
    // HGVS: { type: GraphQLString }, // TODO: add this
    // HGVSc: { type: GraphQLString }, // TODO: add this
    // HGVSp: { type: GraphQLString }, // TODO: add this
    ac_female: { type: GraphQLString }, // TODO: should be Int
    ac_male: { type: GraphQLString }, // TODO: should be Int
    allele_count: { type: GraphQLInt },
    allele_freq: { type: GraphQLFloat },
    allele_num: { type: GraphQLInt },
    alt: { type: GraphQLString },
    an_female: { type: GraphQLString }, // TODO: should be Int
    an_male: { type: GraphQLString }, // TODO: should be Int
    // category: { type: GraphQLString },
    chrom: { type: GraphQLString }, // TODO: should be Int?
    filter: { type: GraphQLString },
    // flags: { type: GraphQLString },
    genes: { type: new GraphQLList(GraphQLString) },
    genotype_depths: { type: GraphQLString }, // TODO: new type/resolve?
    genotype_qualities: { type: GraphQLString }, // TODO: new type/resolve?
    hom_count: { type: GraphQLInt },
    // indel: { type: GraphQLString }, // TODO: add this
    // major_consequence: { type: GraphQLString }, // TODO: add this
    orig_alt_alleles: { type: new GraphQLList(GraphQLString) },
    pop_acs: { type: populationType },
    pop_ans: { type: populationType },
    pop_homs: { type: populationType },
    pos: { type: GraphQLInt },
    quality_metrics: { type: qualityMetricsType },
    ref: { type: GraphQLString },
    rsid: { type: GraphQLString },
    site_quality: { type: GraphQLInt },
    transcripts: { type: new GraphQLList(GraphQLString) },
    variant_id: { type: GraphQLString },
    vep_annotations: { type: new GraphQLList(vepType) },
    xpos: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    xstop: { type: GraphQLFloat },
    has_mnp: { type: GraphQLBoolean },
    mnps: { type: new GraphQLList(mnpType) },
  }),
})

export default variantType

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

export const lookupVariantsByGeneId = (db, collection, gene_id) =>
  db.collection(collection).find({ genes: gene_id }).toArray()

export const lookupVariantsByTranscriptId = (db, collection, transcript_id) =>
  db.collection(collection).find({ transcripts: transcript_id }).toArray()

export const lookupVariantsByStartStop = (db, collection, xstart, xstop) =>
  db.collection(collection).find(
    { xpos: { '$lte': Number(xstart), '$gte': Number(xstop) } }
  ).toArray()

export const variantResolver = (obj, args, ctx) => {  // eslint-disable-line
  let database
  let collection
  if (args.source === 'genome' || args.source === 'exome') {
    database = ctx.database.gnomad
    collection = args.source === 'genome' ? 'genome_variants' : 'exome_variants'
  } else {
    database = ctx.database.exacv1
    collection = 'variants'
  }
  if (args.id) {
    return lookupVariant(database, collection, args.id)
  } else if (args.rsid) {
    return lookupVariantRsid(database, collection, args.rsid)
  }
}

