import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import browserConfig from '@browser/config'

import { fetchAllSearchResults } from '../utilities/elasticsearch'
import { UserVisibleError } from '../utilities/errors'

const resultFields = {
  analysis_group: { type: GraphQLString },
  // Case/Control numbers
  ac_case: { type: GraphQLInt },
  ac_ctrl: { type: GraphQLInt },
  af_case: { type: GraphQLFloat },
  af_ctrl: { type: GraphQLFloat },
  an_case: { type: GraphQLInt },
  an_ctrl: { type: GraphQLInt },
  // Analysis results
  comment: { type: GraphQLString },
  est: { type: GraphQLFloat },
  i2: { type: GraphQLFloat },
  in_analysis: { type: GraphQLBoolean },
  n_denovos: { type: GraphQLInt },
  p: { type: GraphQLFloat },
  qp: { type: GraphQLFloat },
  se: { type: GraphQLFloat },
  source: { type: new GraphQLList(GraphQLString) },
}

const VariantResultType = new GraphQLObjectType({
  name: 'VariantResult',
  fields: resultFields,
})

export const VariantType = new GraphQLObjectType({
  name: 'Variant',
  fields: {
    variant_id: { type: GraphQLString },
    chrom: { type: GraphQLString },
    pos: { type: GraphQLInt },
    // Annotation fields
    cadd: { type: GraphQLFloat },
    canonical_transcript_id: { type: GraphQLString },
    consequence: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsc_canonical: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    hgvsp_canonical: { type: GraphQLString },
    mpc: { type: GraphQLFloat },
    polyphen: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
    // Result fields
    ...resultFields,
  },
})

export const fetchVariantsByGeneId = async (ctx, geneId, analysisGroup) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: browserConfig.elasticsearch.variants.index,
    type: browserConfig.elasticsearch.variants.type,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { gene_id: geneId } },
            {
              bool: {
                should: [
                  { range: { [`groups.${analysisGroup}.ac_case`]: { gt: 0 } } },
                  { range: { [`groups.${analysisGroup}.ac_ctrl`]: { gt: 0 } } },
                ],
              },
            },
          ],
        },
      },
    },
  })

  return hits.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle

    const groupResult = doc.groups[analysisGroup]

    return {
      variant_id: doc.variant_id,
      chrom: doc.chrom,
      pos: doc.pos,
      // Annotation fields
      cadd: doc.cadd,
      canonical_transcript_id: doc.canonical_transcript_id,
      consequence: doc.csq_analysis || doc.csq_canonical,
      gene_id: doc.gene_id,
      gene_name: doc.gene_name,
      hgvsc: doc.hgvsc,
      hgvsc_canonical: doc.hgvsc_canonical ? doc.hgvsc_canonical.split(':')[1] : null,
      hgvsp: doc.hgvsp,
      hgvsp_canonical: doc.hgvsp_canonical ? doc.hgvsp_canonical.split(':')[1] : null,
      mpc: doc.mpc,
      polyphen: doc.polyphen,
      transcript_id: doc.transcript_id,
      // Result fields
      analysis_group: analysisGroup,
      // Epi25 has these two fields stored at the variant-level
      comment: doc.comment,
      in_analysis: doc.in_analysis,
      ...groupResult,
    }
  })
}

export const VariantDetailsType = new GraphQLObjectType({
  name: 'VariantDetail',
  fields: {
    results: { type: new GraphQLList(VariantResultType) },
  },
})

export const fetchVariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: browserConfig.elasticsearch.variants.index,
    type: browserConfig.elasticsearch.variants.type,
    size: 1,
    body: {
      query: {
        match: {
          variant_id: variantId,
        },
      },
    },
  })

  if (!response.hits.hits.length) {
    throw new UserVisibleError('Variant not found')
  }

  const doc = response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle

  const results = Object.entries(doc.groups)
    .filter(entry => entry[1] && Object.entries(entry[1]).length !== 0)
    .map(([groupName, groupData]) => ({
      analysis_group: groupName,
      // Epi25 has these two fields stored at the variant-level
      comment: doc.comment,
      in_analysis: doc.in_analysis,
      ...groupData,
    }))

  return { results }
}
