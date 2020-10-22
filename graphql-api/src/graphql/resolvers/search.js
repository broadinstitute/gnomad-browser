const { fetchSearchResults } = require('../../queries/search')

const resolveSearchResults = async (obj, args, ctx) => {
  return fetchSearchResults(ctx.esClient, args.dataset, args.query)
}

module.exports = {
  Query: {
    searchResults: resolveSearchResults,
  },
}
