/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
} from 'graphql'

import vepType from './vep'
import populationType from './populations'
import qualityMetricsType from './qualityMetrics'

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
    an_female: { type: GraphQLInt }, // TODO: should be Int
    an_male: { type: GraphQLInt }, // TODO: should be Int
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
    xpos: { type: GraphQLInt },
    xstart: { type: GraphQLInt },
    xstop: { type: GraphQLInt },
  }),
})

export default variantType

export const lookupVariant = (db, source, variant_id) => {
  const collection = source === 'exac' ? 'exome_variants' : 'genome_variants'
  const [chrom, pos, ref, alt] = variant_id.split('-')
  return db.collection(collection).findOne({
    xpos: chrom + pos,
    ref,
    alt,
  })
}

export const lookupVariantRsid = (db, source, rsid) => {
  const collection = source === 'exac' ? 'exome_variants' : 'genome_variants'
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
