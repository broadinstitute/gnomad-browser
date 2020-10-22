const { UserVisibleError } = require('../errors')

const gnomadSvV2Queries = require('./structural-variant-datasets/gnomad-sv-v2-queries')

const datasetQueries = {
  gnomad_sv_r2_1: {
    fetchStructuralVariantById: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, 'all'),
    fetchStructuralVariantsByGene: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, 'all'),
    fetchStructuralVariantsByRegion: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, 'all'),
  },
}

const subsets = ['controls', 'non_neuro']
subsets.forEach((subset) => {
  datasetQueries[`gnomad_sv_r2_1_${subset}`] = {
    fetchStructuralVariantById: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, subset),
    fetchStructuralVariantsByGene: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, subset),
    fetchStructuralVariantsByRegion: (...args) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, subset),
  }
})

const fetchStructuralVariantById = (esClient, datasetId, variantId) => {
  const query = datasetQueries[datasetId].fetchStructuralVariantById
  return query(esClient, variantId)
}

const fetchStructuralVariantsByGene = (esClient, datasetId, gene) => {
  if (gene.reference_genome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${gene.reference_genome}`
    )
  }

  const query = datasetQueries[datasetId].fetchStructuralVariantsByGene
  return query(esClient, gene)
}

const fetchStructuralVariantsByRegion = (esClient, datasetId, region) => {
  if (region.reference_genome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${region.reference_genome}`
    )
  }

  const query = datasetQueries[datasetId].fetchStructuralVariantsByRegion
  return query(esClient, region)
}

module.exports = {
  fetchStructuralVariantById,
  fetchStructuralVariantsByGene,
  fetchStructuralVariantsByRegion,
}
