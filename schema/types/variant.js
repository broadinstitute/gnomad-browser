/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList,
} from 'graphql'

import vepType from './vep'
// import populationType from './populations'
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
    // pop_acs: { type: populationType },
    // pop_ans: { type: populationType },
    // pop_homs: { type: populationType },
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

export const lookUpVariantsByGeneId = (db, gene_id) =>
  db.collection('variants').find({ genes: gene_id }).toArray()
