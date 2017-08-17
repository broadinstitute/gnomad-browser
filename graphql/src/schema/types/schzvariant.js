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

import fetch from 'isomorphic-fetch'

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
      chrom: { type: GraphQLInt },
      pos: { type: GraphQLInt },
      ref: { type: GraphQLString },
      alt: { type: GraphQLString }
    }),
  })

export function lookupSchzVariantsByStartStopElastic (chr, xstart, xstop) {
  return new Promise((resolve, reject) => {
    const form = `{
      "query": {
        "range" : {
            "xpos" : {
              "gte" : ${xstart},
              "lte" : ${xstop}
            }
        }
      }
    }`
    // fetch('http://35.202.72.34:9200/schizophrenia/variant/_search?pretty', {
    fetch('http://35.202.72.34:9200/schizophrenia/variant/_search?pretty', {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: form
    }).then(response => {
      // console.log(response.status)
      // if (response.status >= 400) {
      //   throw new Error("Bad response from server");
      // }
      response.json().then(data => {
        console.log(data)
        resolve(data.hits.hits.map(h => h._source))
      })
    }).catch(error => console.log(error))
  })
}
