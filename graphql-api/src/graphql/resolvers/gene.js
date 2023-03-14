const { UserVisibleError } = require('../../errors')
const {
  fetchGeneById,
  fetchGeneBySymbol,
  fetchGenesMatchingText,
} = require('../../queries/gene-queries')

const addDefaultVariantCooccurrenceCounts = (gene) => {
  return {
    heterozygous_variant_cooccurrence_counts: [],
    homozygous_variant_cooccurrence_counts: [],
    ...gene,
  }
}

const resolveGene = async (_, args, ctx) => {
  if (args.gene_id) {
    const gene = await fetchGeneById(ctx.esClient, args.gene_id, args.reference_genome)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return addDefaultVariantCooccurrenceCounts(gene)
  }

  if (args.gene_symbol) {
    const gene = await fetchGeneBySymbol(ctx.esClient, args.gene_symbol, args.reference_genome)
    if (!gene) {
      throw new UserVisibleError('Gene not found')
    }
    return addDefaultVariantCooccurrenceCounts(gene)
  }

  throw new UserVisibleError("One of 'gene_id' or 'gene_symbol' is required")
}

const resolveGeneSearch = (_, args, ctx) => {
  return fetchGenesMatchingText(ctx.esClient, args.query, args.reference_genome)
}

module.exports = {
  Query: {
    gene: resolveGene,
    gene_search: resolveGeneSearch,
  },
}
