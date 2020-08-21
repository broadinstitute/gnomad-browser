const { UserVisibleError } = require('../errors')

const resolveGene = (_, args, ctx) => {
  if (args.gene_id) {
    return ctx.queryInternalAPI(`/${args.reference_genome}/gene/${args.gene_id}/`, {
      cacheKey: `gene:${args.gene_id}:${args.reference_genome}`,
      cacheExpiration: 604800,
    })
  }

  if (args.gene_symbol) {
    const geneIds = ctx.geneSearch.get(args.gene_symbol.toUpperCase())
    // if (geneIds.length === 0) {
    //   throw new UserVisibleError('Gene not found')
    // }
    return ctx.queryInternalAPI(`/${args.reference_genome}/gene/${geneIds[0]}/`, {
      cacheKey: `gene:${geneIds[0]}:${args.reference_genome}`,
      cacheExpiration: 604800,
    })
  }

  throw new UserVisibleError("One of 'gene_id' or 'gene_symbol' is required")
}

module.exports = {
  Query: {
    gene: resolveGene,
  },
}
