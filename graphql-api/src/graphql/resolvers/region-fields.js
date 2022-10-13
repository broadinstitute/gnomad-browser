const { fetchGenesByRegion } = require('../../queries/gene-queries')
const { fetchNccConstraintsByRegion } = require('../../queries/genomic-constraint-queries')

const resolveGenesInRegion = (obj, args, ctx) => {
  return fetchGenesByRegion(ctx.esClient, obj)
}

const resolveNCCsInRegion = (obj, args, ctx) => {
  return fetchNccConstraintsByRegion(ctx.esClient, obj)
}

module.exports = {
  Region: {
    genes: resolveGenesInRegion,
    non_coding_constraints: resolveNCCsInRegion,
  },
}
