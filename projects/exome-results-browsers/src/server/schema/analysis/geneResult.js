import { GraphQLInt, GraphQLFloat, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

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
  categories: BROWSER_CONFIG.geneResults.categories.map(category => ({
    id: category.id,
    xcase: doc[`xcase_${category.id}`],
    xctrl: doc[`xctrl_${category.id}`],
    pval: doc[`pval_${category.id}`],
  })),
})

export const fetchOverallGeneResultByGeneId = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.geneResults.index,
    type: BROWSER_CONFIG.elasticsearch.geneResults.type,
    size: 1,
    body: {
      query: {
        bool: {
          filter: [
            { term: { gene_id: geneId } },
            { term: { analysis_group: BROWSER_CONFIG.analysisGroups.overallGroup } },
          ],
        },
      },
    },
  })
  return shapeGeneResult(response.hits.hits[0]._source) // eslint-disable-line no-underscore-dangle
}

export const fetchAllOverallGeneResults = async ctx => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: BROWSER_CONFIG.elasticsearch.geneResults.index,
    type: BROWSER_CONFIG.elasticsearch.geneResults.type,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: {
            term: { analysis_group: BROWSER_CONFIG.analysisGroups.overallGroup },
          },
        },
      },
      sort: [{ pval_meta: { order: 'asc' } }],
    },
  })

  return hits.map(hit => shapeGeneResult(hit._source)) // eslint-disable-line no-underscore-dangle
}
