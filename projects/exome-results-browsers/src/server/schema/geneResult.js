import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import browserConfig from '@browser/config'

import { fetchAllSearchResults } from '../utilities/elasticsearch'

export const GeneResultGroupIdType = new GraphQLEnumType({
  name: 'GeneResultGroupId',
  values: browserConfig.geneResults.groups.options.reduce(
    (values, analysisGroup) => ({ ...values, [analysisGroup]: {} }),
    {}
  ),
})

const geneResultColumns = browserConfig.geneResults.columns

const types = {
  boolean: GraphQLBoolean,
  float: GraphQLFloat,
  int: GraphQLInt,
  string: GraphQLString,
}

export const GeneResultType = new GraphQLObjectType({
  name: 'GeneResult',
  fields: {
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    gene_description: { type: GraphQLString },
    analysis_group: { type: GraphQLString },
    chrom: { type: GraphQLString },
    pos: { type: GraphQLInt },
    ...geneResultColumns.reduce(
      (acc, col) => ({
        ...acc,
        [col.key]: { type: types[col.type || 'float'] },
      }),
      {}
    ),
  },
})

const shapeGeneResult = doc => ({
  gene_id: doc.gene_id,
  gene_name: doc.gene_name,
  gene_description: doc.gene_description,
  chrom: doc.chrom,
  pos: doc.pos,
  analysis_group: doc.analysis_group,
  ...geneResultColumns.reduce(
    (acc, col) => ({
      ...acc,
      [col.key]: doc[col.key],
    }),
    {}
  ),
})

const geneResultsCache = new Map()

export const fetchAllGeneResultsForAnalysisGroup = (ctx, analysisGroup) => {
  if (geneResultsCache.has(analysisGroup)) {
    return geneResultsCache.get(analysisGroup)
  }

  const request = fetchAllSearchResults(ctx.database.elastic, {
    index: browserConfig.elasticsearch.geneResults.index,
    type: browserConfig.elasticsearch.geneResults.type,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: {
            term: { analysis_group: analysisGroup },
          },
        },
      },
    },
  }).then(hits => hits.map(hit => shapeGeneResult(hit._source))) // eslint-disable-line no-underscore-dangle

  geneResultsCache.set(analysisGroup, request)

  return request
}

export const fetchGeneResultsForGene = async (ctx, gene) => {
  let response = await ctx.database.elastic.search({
    index: browserConfig.elasticsearch.geneResults.index,
    type: browserConfig.elasticsearch.geneResults.type,
    size: 100,
    body: {
      query: {
        bool: {
          filter: { term: { gene_id: gene.gene_id } },
        },
      },
    },
  })

  if (response.hits.hits.length === 0) {
    response = await ctx.database.elastic.search({
      index: browserConfig.elasticsearch.geneResults.index,
      type: browserConfig.elasticsearch.geneResults.type,
      size: 100,
      body: {
        query: {
          bool: {
            filter: { term: { gene_name: gene.gene_name } },
          },
        },
      },
    })
  }

  return response.hits.hits.map(hit => shapeGeneResult(hit._source)) // eslint-disable-line no-underscore-dangle
}
