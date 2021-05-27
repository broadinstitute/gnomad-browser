const { fetchVariantCooccurrence } = require('../../queries/variant-cooccurrence-queries')

const resolveVariantCooccurrence = (_, args, ctx) => {
  return fetchVariantCooccurrence(ctx.esClient, args.dataset, args.variants)
}

module.exports = {
  Query: {
    variant_cooccurrence: resolveVariantCooccurrence,
  },
}
