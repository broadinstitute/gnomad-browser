import {
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLString,
} from 'graphql'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'


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
  }),
})

export default clinvarType


export async function lookupClinvarVariantsByGeneName(client, geneName) {
  const fields = [
    'chrom',
    'pos',
    'ref',
    'alt',
    'MEASURESET_TYPE',
    'MEASURESET_ID',
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
  ]

  const esVariants = await fetchAllSearchResults(
    client,
    {
      index: 'clinvar',
      type: 'variant',
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { term: { SYMBOL: geneName } },
              { exists: { field: 'HGVS_P' } },
            ],
          },
        },
        sort: [
          { xpos: { order: 'asc' } },
        ],
      },
    }
  )

  return esVariants.map(esVariant => ({
    age_of_onset: esVariant.AGE_OF_ONSET,
    all_submitters: esVariant.ALL_SUBMITTERS,
    all_pmids: esVariant.ALL_PMIDS,
    all_traits: esVariant.ALL_TRAITS,
    allele_id: esVariant.ALLELE_ID,
    alt: esVariant.alt,
    benign: esVariant.BENIGN,
    chrom: esVariant.chrom,
    clinical_significance: esVariant.CLINICAL_SIGNIFICANCE,
    disease_mechanism: esVariant.DISEASE_MECHANISM,
    gold_stars: esVariant.GOLD_STARS,
    hgvsc: esVariant.HGVS_C,
    hgvsp: esVariant.HGVS_P,
    inflicted: esVariant.CONFLICTED,
    inheritance_modes: esVariant.INHERITANCE_MODES,
    measureset_type: esVariant.MEASURESET_TYPE,
    measureset_id: esVariant.MEASURESET_ID,
    molecular_consequence: esVariant.MOLECULAR_CONSEQUENCE,
    origin: esVariant.ORIGIN,
    pathogenic: esVariant.PATHOGENIC,
    pos: esVariant.pos,
    prevalence: esVariant.PREVALENCE,
    ref: esVariant.ref,
    review_status: esVariant.REVIEW_STATUS,
    symbol: esVariant.SYMBOL,
    variant_id: `${esVariant.chrom}-${esVariant.pos}-${esVariant.ref}-${esVariant.alt}`,
    xpos: esVariant.xpos,
  }))
}
