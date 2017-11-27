/* eslint-disable no-underscore-dangle */
import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

const pageVariantType = new GraphQLObjectType({
  name: 'PageVariant',
  fields: () => ({
    id: { type: GraphQLString },
    alleleCount: { type: GraphQLInt },
  })
})

export const pageVariants = {
  description: 'Variants!',
  args: {
    index: { type: GraphQLString },
    geneId: { type: GraphQLString },
    cursor: { type: GraphQLString },
  },
  type: new GraphQLObjectType({
    name: 'PageVariants',
    fields: () => ({
      variantCount: { type: GraphQLInt },
      cursor: { type: GraphQLString },
      variants: { type: new GraphQLList(pageVariantType) },
    })
  }),
  resolve: (obj, args, ctx) => {
    return lookup({
      elasticClient: ctx.database.elastic,
      index: args.index,
      cursor: args.cursor,
      geneId: args.geneId,
    })
  }
}

function formatVariants (response) {
  const variants = response.hits.hits.map(v => ({
    id: v._source.variantId,
    alleleCount: v._source.AC,
  }))
  return {
    variants,
    variantCount: response.hits.total,
    cursor: response._scroll_id,
  }
}

function lookup ({
  elasticClient,
  index,
  geneId,
  cursor
}) {
  if (cursor) {
    return elasticClient.scroll({
      scrollId: cursor,
      scroll: '1m',
    }).then(formatVariants)
  }
  return elasticClient.search({
    index,
    type: 'variant',
    size: 3,
    scroll: '1m',
    // _source: ['variant_id', 'allele_count'],
    body: {
      query: {
        bool: {
          must: [
            { term: { geneId } }
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  }).then(formatVariants)
}
