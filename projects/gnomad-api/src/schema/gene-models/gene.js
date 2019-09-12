import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'
import { UserVisibleError } from '../errors'

import { ExonType } from './exon'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    gene_name: { type: new GraphQLNonNull(GraphQLString) },
    full_gene_name: { type: GraphQLString },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    exons: { type: new GraphQLNonNull(new GraphQLList(ExonType)) },
    strand: { type: new GraphQLNonNull(GraphQLString) },
    canonical_transcript_id: { type: GraphQLString },
    // TODO Remove this field
    canonical_transcript: {
      type: GraphQLString,
      resolve: obj => obj.canonical_transcript_id,
    },
    other_names: { type: new GraphQLList(GraphQLString) },
    omim_accession: { type: GraphQLString },
    omim_description: { type: GraphQLString },
  },
})

export const fetchGeneById = async (ctx, geneId) => {
  const response = await ctx.database.elastic.get({
    index: 'genes_grch37',
    type: 'documents',
    id: geneId,
  })

  if (!response.found) {
    throw new UserVisibleError('Gene not found')
  }

  return response._source
}

export const fetchGeneByName = async (ctx, geneName) => {
  const response = await ctx.database.elastic.search({
    index: 'genes_grch37',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: { term: { gene_name_upper: geneName.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  if (response.hits.total === 0) {
    throw new UserVisibleError('Gene not found')
  }

  return response.hits.hits[0]._source
}

export const fetchGenesByRegion = async (ctx, { xstart, xstop }) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'genes_grch37',
    type: 'documents',
    size: 200,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                xstart: {
                  lte: xstop,
                },
              },
            },
            {
              range: {
                xstop: {
                  gte: xstart,
                },
              },
            },
          ],
        },
      },
    },
  })

  return hits.map(hit => hit._source)
}
