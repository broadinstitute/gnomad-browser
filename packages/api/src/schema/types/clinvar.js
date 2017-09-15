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

const clinvarType = new GraphQLObjectType({
  name: 'ClinvarType',
  fields: () => ({
    chrom: { type: GraphQLString },
    pos: { type: GraphQLFloat },
    xpos: { type: GraphQLFloat },
    ref: { type: GraphQLString },
    alt: { type: GraphQLString },
    variant_id: { type: GraphQLString },
    measureset_type: { type: GraphQLString },
    measureset_id: { type: GraphQLString },
    // rcv: { type: GraphQLInt },
    allele_id: { type: GraphQLString },
    symbol: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    molecular_consequence: { type: GraphQLString },
    clinical_significance: { type: GraphQLString },
    pathogenic: { type: GraphQLString },
    benign: { type: GraphQLString },
    inflicted: { type: GraphQLString },
    review_status: { type: GraphQLString },
    gold_stars: { type: GraphQLString },
    all_submitters: { type: GraphQLString },
    all_traits: { type: GraphQLString },
    all_pmids: { type: GraphQLString },
    inheritance_modes: { type: GraphQLString },
    age_of_onset: { type: GraphQLString },
    prevalence: { type: GraphQLString },
    disease_mechanism: { type: GraphQLString },
    origin: { type: GraphQLString },
    // xref: { type: GraphQLString },
  }),
})

export default clinvarType


export const lookupClinvarVariantsByGeneName = (client, dataset, gene_name) => {
  const fields = [
    'chrom',
    'pos',
    'ref',
    'alt',
    'MEASURESET_TYPE',
    'MEASURESET_ID',
    // 'RCV',
    'ALLELE_ID',
    'SYMBOL',
    'HGVS_C',
    'HGVS_P',
    'MOLECULAR_CONSEQUENCE',
    'CLINICAL_SIGNIFICANCE',
    'PATHOGENIC',
    'BENIGN',
    'CONFLICTED',
    'REVIEW_STATUS',
    'GOLD_STARS',
    'ALL_SUBMITTERS',
    'ALL_TRAITS',
    'ALL_PMIDS',
    'INHERITANCE_MODES',
    'AGE_OF_ONSET',
    'PREVALENCE',
    'DISEASE_MECHANISM',
    'ORIGIN',
    // 'XREFS',
  ]
  return new Promise((resolve, reject) => {
    client.search({
      index: 'clinvar',
      type: 'variant',
      size: 1000,
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { term: { SYMBOL: gene_name } },
              { exists: { field: 'HGVS_P' } },
            ],
          },
        },
        sort: [ { xpos: { order: "asc" }}],
      },
    }).then(response => {
      console.log(response)
      resolve(response.hits.hits.map(v => {
        const elastic_variant = v._source
        return ({
          chrom: elastic_variant.chrom,
          pos: elastic_variant.pos,
          xpos: elastic_variant.xpos,
          ref: elastic_variant.ref,
          alt: elastic_variant.alt,
          variant_id: `${elastic_variant.chrom}-${elastic_variant.pos}-${elastic_variant.ref}-${elastic_variant.alt}`,
          measureset_type: elastic_variant.MEASURESET_TYPE,
          measureset_id: elastic_variant.MEASURESET_ID,
          // rcv: elastic_variant.RCV,
          allele_id: elastic_variant.ALLELE_ID,
          symbol: elastic_variant.SYMBOL,
          hgvsc: elastic_variant.HGVS_C,
          hgvsp: elastic_variant.HGVS_P,
          molecular_consequence: elastic_variant.MOLECULAR_CONSEQUENCE,
          clinical_significance: elastic_variant.CLINICAL_SIGNIFICANCE,
          pathogenic: elastic_variant.PATHOGENIC,
          benign: elastic_variant.BENIGN,
          inflicted: elastic_variant.CONFLICTED,
          review_status: elastic_variant.REVIEW_STATUS,
          gold_stars: elastic_variant.GOLD_STARS,
          all_submitters: elastic_variant.ALL_SUBMITTERS,
          all_traits: elastic_variant.ALL_TRAITS,
          all_pmids: elastic_variant.ALL_PMIDS,
          inheritance_modes: elastic_variant.INHERITANCE_MODES,
          age_of_onset: elastic_variant.AGE_OF_ONSET,
          prevalence: elastic_variant.PREVALENCE,
          disease_mechanism: elastic_variant.DISEASE_MECHANISM,
          origin: elastic_variant.ORIGIN,
          // xref: elastic_variant.XREFS,
        })
      }))
    })
  })
}
