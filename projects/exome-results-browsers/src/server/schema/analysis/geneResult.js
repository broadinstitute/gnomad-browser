import { GraphQLInt, GraphQLFloat, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import browserConfig from '@browser/config'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'

const GeneResultCategoryType = new GraphQLObjectType({
  name: 'GeneResultCategory',
  fields: {
    id: { type: GraphQLString },
    xcase: { type: GraphQLInt },
    xctrl: { type: GraphQLInt },
    pval: { type: GraphQLFloat },
  },
})

export const GeneResultType = new GraphQLObjectType({
  name: 'GeneResult',
  fields: {
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    gene_description: { type: GraphQLString },
    analysis_group: { type: GraphQLString },
    categories: { type: new GraphQLList(GeneResultCategoryType) },
    pval_meta: { type: GraphQLFloat },
  },
})

const shapeGeneResult = doc => ({
  gene_id: doc.gene_id,
  gene_name: doc.gene_name,
  gene_description: doc.description,
  analysis_group: doc.analysis_group,
  pval_meta: doc.pval_meta,
  categories: browserConfig.geneResults.categories.map(category => ({
    id: category.id,
    xcase: doc[`xcase_${category.id}`],
    xctrl: doc[`xctrl_${category.id}`],
    pval: doc[`pval_${category.id}`],
  })),
})

export const fetchAllGeneResultsForAnalysisGroup = async (ctx, analysisGroup) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
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
      sort: [{ pval_meta: { order: 'asc' } }],
    },
  })

  return hits.map(hit => shapeGeneResult(hit._source)) // eslint-disable-line no-underscore-dangle
}

export const fetchGeneResultsByGeneId = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: browserConfig.elasticsearch.geneResults.index,
    type: browserConfig.elasticsearch.geneResults.type,
    size: 100,
    body: {
      query: {
        bool: {
          filter: { term: { gene_id: geneId } },
        },
      },
    },
  })

  return response.hits.hits.map(hit => shapeGeneResult(hit._source)) // eslint-disable-line no-underscore-dangle
}
