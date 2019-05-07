import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import browserConfig from '@browser/config'

import { fetchAllSearchResults } from '../utilities/elasticsearch'
import { UserVisibleError } from '../utilities/errors'

export const VariantResultGroupIdType = new GraphQLEnumType({
  name: 'VariantResultGroupId',
  values: browserConfig.variants.groups.options.reduce(
    (values, analysisGroup) => ({ ...values, [analysisGroup]: {} }),
    {}
  ),
})

const types = {
  boolean: GraphQLBoolean,
  float: GraphQLFloat,
  int: GraphQLInt,
  string: GraphQLString,
}

const getType = typeStr => {
  if (typeStr.endsWith('[]')) {
    return new GraphQLList(getType(typeStr.slice(0, -2)))
  }
  return types[typeStr]
}

const resultFields = {
  analysis_group: { type: new GraphQLNonNull(GraphQLString) },
  // Case/Control numbers
  ac_case: { type: GraphQLInt },
  ac_ctrl: { type: GraphQLInt },
  af_case: { type: GraphQLFloat },
  af_ctrl: { type: GraphQLFloat },
  an_case: { type: GraphQLInt },
  an_ctrl: { type: GraphQLInt },
  // Analysis results
  ...browserConfig.variants.columns.reduce(
    (acc, c) => ({
      ...acc,
      [c.key]: { type: getType(c.type || 'float') },
    }),
    {}
  ),
}

const getResultData = (doc, analysisGroup) => {
  const result = doc.groups[analysisGroup]
  return {
    // Epi25 has these two fields stored at the variant-level
    comment: doc.comment,
    in_analysis: doc.in_analysis,
    ...result,
    af_case: result.an_case === 0 ? 0 : result.af_case,
    af_ctrl: result.an_ctrl === 0 ? 0 : result.af_ctrl,
  }
}

const VariantResultType = new GraphQLObjectType({
  name: 'VariantResult',
  fields: resultFields,
})

export const VariantType = new GraphQLObjectType({
  name: 'Variant',
  fields: {
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    // Annotation fields
    consequence: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
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

    return {
      variant_id: doc.variant_id,
      chrom: doc.chrom,
      pos: doc.pos,
      // Annotation fields
      consequence: doc.csq_analysis || doc.csq_canonical,
      hgvsc: doc.hgvsc_canonical ? doc.hgvsc_canonical.split(':')[1] : null,
      hgvsp: doc.hgvsp_canonical ? doc.hgvsp_canonical.split(':')[1] : null,
      // Result fields
      analysis_group: analysisGroup,
      ...getResultData(doc, analysisGroup),
    }
  })
}

export const VariantDetailsType = new GraphQLObjectType({
  name: 'VariantDetail',
  fields: {
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
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
    // Results
    results: { type: new GraphQLNonNull(new GraphQLList(VariantResultType)) },
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
    .map(entry => ({
      analysis_group: entry[0],
      ...getResultData(doc, entry[0]),
    }))

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
    // Results
    results,
  }
}
