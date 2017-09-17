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

import elasticsearch from 'elasticsearch'

const schzVariantType = new GraphQLObjectType({
  name: 'schzVariant',
  fields: () => ({
    chr: { type: GraphQLInt },
    pos: { type: GraphQLInt },
    ref: { type: GraphQLString },
    alt: { type: GraphQLString },
    n_study: {
      type: GraphQLInt,
      description: 'Number of studies with this variant',
    },
    study: {
      type: GraphQLString,
      description: 'Direction in each study',
    },
    p_value: {
      type: GraphQLFloat,
      description: 'Number of studies with this variant',
    },
    scz_af: {
      type: GraphQLFloat,
      description: 'Allele frequency for controls across all studies',
    },
    hc_af: {
      type: GraphQLFloat,
      description: '?',
    },
    odds_ratio: {
      type: GraphQLFloat,
      description: 'Meta-analysis odds ratio',
    },
    se: {
      type: GraphQLFloat,
      description: 'Meta-analysis standard error for log odds ratio',
    },
    // imputation_quality: {
    //   type: GraphQLInt,
    //   description: 'Imputation quality',
    // },
    qp: {
      type: GraphQLFloat,
      description: 'p-value from heterogeneity test',
    },
    i_squared: {
      type: GraphQLFloat,
      description: 'I2 from heterogeneity test',
    },
    mhtp: {
      type: GraphQLFloat,
      description: 'Meta-analysis p-value from Mantel-Haenszel test',
    },
    comment: {
      type: GraphQLString,
      description: 'Additional information about this variant using controlled vocabulary, including "denovo", "hemizygous", and "TDT"',
    },
    // populations: {
    //   type: new GraphQLList(metaVariantPopulationType),
    //   description: 'Individual population statistics',
    // },
    // studies: {
    //   type: new GraphQLList(metaVariantPopulationType),
    //   description: 'Individual study statistics',
    // },
  }),
})

export default schzVariantType

export const lookupSchzVariantsByStartStop = (db, collection, chr, xstart, xstop) =>
  db.collection(collection).find(
    { chr, pos: { '$gte': Number(xstart), '$lte': Number(xstop) } }
  ).toArray()


export const schzVariantTypeExome = new GraphQLObjectType({
  name: 'schzVariantExome',
  fields: () => ({
    chrom: { type: GraphQLString },
    pos: { type: GraphQLInt },
    xpos: { type: GraphQLFloat },
    ref: { type: GraphQLString },
    alt: { type: GraphQLString },
    rsid: { type: GraphQLString },
    qual: { type: GraphQLFloat },
    filters: { type: new GraphQLList(GraphQLString) },

    variantId: { type: GraphQLString },
    originalAltAlleles: { type: new GraphQLList(GraphQLString) },
    geneIds: { type: new GraphQLList(GraphQLString) },
    transcriptIds: { type: new GraphQLList(GraphQLString) },
    transcriptConsequenceTerms: {
      type: GraphQLString,
      resolve: obj => obj.transcriptConsequenceTerms[0]
    },
    sortedTranscriptConsequences: { type: GraphQLString },

    AC: {
      type: GraphQLInt,
      resolve: obj => obj.AC[0],
    },
    AF: {
      type: GraphQLFloat,
      resolve: obj => obj.AF[0],
    },
    AC_cases: { type: GraphQLInt },
    AC_ctrls: { type: GraphQLInt },
    AC_UK_cases: { type: GraphQLInt },
    AC_UK_ctrls: { type: GraphQLInt },
    AC_FIN_cases: { type: GraphQLInt },
    AC_FIN_ctrls: { type: GraphQLInt },
    AC_SWE_cases: { type: GraphQLInt },
    AC_SWE_ctrls: { type: GraphQLInt },

    mainTranscriptAminoAcids: { type: GraphQLString },
    mainTranscriptBiotype: { type: GraphQLString },
    mainTranscriptCanonical: { type: GraphQLInt },
    mainTranscriptCdnaStart: { type: GraphQLInt },
    mainTranscriptCdnaEnd: { type: GraphQLInt },
    mainTranscriptCodons: { type: GraphQLString },
    mainTranscriptDomains: { type: GraphQLString },
    mainTranscriptExon: { type: GraphQLString },
    mainTranscriptGeneId: { type: GraphQLString },
    mainTranscriptGeneSymbol: { type: GraphQLString },
    mainTranscriptGeneSymbolSource: { type: GraphQLString },
    mainTranscriptHgncId: { type: GraphQLString },
    mainTranscriptHgvsc: { type: GraphQLString },
    mainTranscriptHgvsp: { type: GraphQLString },
    mainTranscriptLof: { type: GraphQLString },
    mainTranscriptLofFlags: { type: GraphQLString },
    mainTranscriptLofFilter: { type: GraphQLString },
    mainTranscriptLofInfo: { type: GraphQLString },
    mainTranscriptProteinId: { type: GraphQLString },
    mainTranscriptTranscriptId: { type: GraphQLString },
    mainTranscriptHgvs: { type: GraphQLString },
    mainTranscriptMajorConsequence: { type: GraphQLString },
    mainTranscriptMajorConsequenceRank: { type: GraphQLInt },
    mainTranscriptCategory: { type: GraphQLString },
  })
})

export function lookupSchzVariantsByGeneId (geneId) {
  const client = new elasticsearch.Client({
    host: 'elastic:9200',
    // log: 'trace',
  })
  return new Promise((resolve, reject) => {
    client.search({
      index: 'schizophrenia',
      type: 'variant',
      size: 1000,
      body: {
        query: {
          match: {
            geneIds: geneId,
          },
        },
      },
    }).then((response) => {
      const variants = response.hits.hits.map(v => v._source)
      resolve(variants)
    })
  })
}
