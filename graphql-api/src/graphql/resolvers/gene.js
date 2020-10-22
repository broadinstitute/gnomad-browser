const { UserVisibleError } = require('../../errors')
const { fetchGeneById, fetchGeneBySymbol } = require('../../queries/gene-queries')

const resolveGene = async (_, args, ctx) => {
  if (args.gene_id) {
    const gene = await fetchGeneById(ctx.esClient, args.gene_id, args.reference_genome)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return gene
  }

  if (args.gene_symbol) {
    const gene = await fetchGeneBySymbol(ctx.esClient, args.gene_symbol, args.reference_genome)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return gene
  }

  throw new UserVisibleError("One of 'gene_id' or 'gene_symbol' is required")
}

module.exports = {
  Query: {
    gene: resolveGene,
  },
}
