const { withCache } = require('../cache')
const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const { assertDatasetAndReferenceGenomeMatch } = require('./helpers/validation-helpers')
const gnomadV3MitochondrialVariantQueries = require('./mitochondrial-variant-datasets/gnomad-v3-mitochondrial-variant-queries')

const datasetQueries = {
  gnomad_r3: {
    fetchMitochondrialVariantById:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantById,
    fetchMitochondrialVariantsByGene:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByGene,
    fetchMitochondrialVariantsByRegion:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByRegion,
  },
}

const fetchMitochondrialVariantById = (esClient, datasetId, variantIdOrRsid) => {
  const query = (datasetQueries[datasetId] || {}).fetchMitochondrialVariantById
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  return query(esClient, variantIdOrRsid)
}

const fetchMitochondrialVariantsByGene = (esClient, datasetId, gene) => {
  if (gene.chrom !== 'M') {
    throw new UserVisibleError('Mitochondrial variants are only available for mitochondrial genes')
  }

  const query = (datasetQueries[datasetId] || {}).fetchMitochondrialVariantsByGene
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  return query(esClient, gene)
}

const fetchMitochondrialVariantsByRegion = (esClient, datasetId, region) => {
  if (region.chrom !== 'M') {
    throw new UserVisibleError('Mitochondrial variants are only available for mitochondrial region')
  }

  const query = (datasetQueries[datasetId] || {}).fetchMitochondrialVariantsByRegion
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  return query(esClient, region)
}

const fetchMitochondrialVariantsByTranscript = (esClient, datasetId, transcript) => {
  // Mitochondrial genes only have one transcript, so gene and transcript queries are equivalent.
  return fetchMitochondrialVariantsByGene(esClient, datasetId, transcript.gene)
}

module.exports = {
  fetchMitochondrialVariantById,
  fetchMitochondrialVariantsByGene: withCache(
    fetchMitochondrialVariantsByGene,
    (_, datasetId, gene) => `mt_variants:${datasetId}:gene:${gene.gene_id}`,
    { expiration: 86400 }
  ),
  fetchMitochondrialVariantsByRegion,
  fetchMitochondrialVariantsByTranscript,
}
