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

const minimalVariantType = new GraphQLObjectType({
  name: 'MinimalVariant',
  fields: () => ({
    variant_id: { type: GraphQLString },
    rsid: { type: GraphQLString },
    // chrom: { type: GraphQLString },
    pos: { type: GraphQLInt },
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
    pass: { type: GraphQLBoolean },
    lof: { type: GraphQLString },
  }),
})

export default minimalVariantType



// const getXpos = (chr, pos) => {
//   const autosomes = Array.from(new Array(22), (x, i) => `chr${i + 1}`)
//   const chromosomes = [...autosomes, 'chrX', 'chrY', 'chrM']
//   const chromosomeCodes = chromosomes.reduce((acc, chrom, i) => {
//     return { ...acc, [chrom]: i + 1 }
//   }, {})
//   const chrStart = chromosomeCodes[`chr${chr}`] * 1e9
//   const xpos = chrStart + Number(pos)
//   return xpos
// }
//
// export const lookupVariant = (db, collection, variant_id) => {
//   const [chrom, pos, ref, alt] = variant_id.split('-')
//   const xpos = getXpos(chrom, pos)
//   return db.collection(collection).findOne({ xpos, ref, alt })
// }
//
export const lookupMinimalVariants = (db, collection, gene_name) => {
  return db.collection(collection).find({ gene_name }).toArray()
}
//
// export const lookupVariantsByGeneId = (db, collection, gene_id, consequence) => {
//   if (consequence) {
//     return db.collection(collection).find({
//       genes: gene_id,
//       vep_annotations: {
//         '$elemMatch': {
//           'Consequence': {
//             '$in': CATEGORY_DEFINITIONS[consequence],
//           },
//         },
//       },
//     }).toArray()
//   }
//   return db.collection(collection).find({ genes: gene_id }).toArray()
// }
//
// export const lookupVariantsByTranscriptId = (db, collection, transcript_id) =>
//   db.collection(collection).find({ transcripts: transcript_id }).toArray()
//
// export const lookupVariantsByStartStop = (db, collection, xstart, xstop) =>
//   db.collection(collection).find(
//     { xpos: { '$gte': Number(xstart), '$lte': Number(xstop) } }
//   ).toArray()
//
// export const variantResolver = (obj, args, ctx) => {  // eslint-disable-line
//   let database
//   let collection
//   if (args.source === 'genome' || args.source === 'exome') {
//     database = ctx.database.gnomad
//     collection = args.source === 'genome' ? 'genome_variants' : 'exome_variants'
//   } else if (args.source === 'exacv1') {
//     database = ctx.database.exacv1
//     collection = 'variants'
//   }
//   if (args.id) {
//     return lookupVariant(database, collection, args.id)
//   } else if (args.rsid) {
//     return lookupVariantRsid(database, collection, args.rsid)
//   }
// }
//
