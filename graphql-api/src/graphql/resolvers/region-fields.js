const { fetchGenesByRegion } = require('../../queries/gene-queries')

const resolveGenesInRegion = (obj, args, ctx) => {
  return fetchGenesByRegion(ctx.esClient, obj)
}

module.exports = {
  Region: {
    genes: resolveGenesInRegion,
  },
}
