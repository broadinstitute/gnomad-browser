const { withCache } = require('../cache')

const { assertDatasetAndReferenceGenomeMatch } = require('./helpers/validation-helpers')
const gnomadV3VariantQueries = require('./variant-datasets/gnomad-v3-variant-queries')
const gnomadV2VariantQueries = require('./variant-datasets/gnomad-v2-variant-queries')
const exacVariantQueries = require('./variant-datasets/exac-variant-queries')

const datasetQueries = {
  gnomad_r3: {
    countVariantsInRegion: (...args) =>
      gnomadV3VariantQueries.countVariantsInRegion(...args, 'all'),
    fetchVariantById: (...args) => gnomadV3VariantQueries.fetchVariantById(...args, 'all'),
    fetchVariantsByGene: (...args) => gnomadV3VariantQueries.fetchVariantsByGene(...args, 'all'),
    fetchVariantsByRegion: (...args) =>
      gnomadV3VariantQueries.fetchVariantsByRegion(...args, 'all'),
    fetchVariantsByTranscript: (...args) =>
      gnomadV3VariantQueries.fetchVariantsByTranscript(...args, 'all'),
    fetchMatchingVariants: (...args) =>
      gnomadV3VariantQueries.fetchMatchingVariants(...args, 'all'),
  },
  gnomad_r2_1: {
    countVariantsInRegion: (...args) =>
      gnomadV2VariantQueries.countVariantsInRegion(...args, 'gnomad'),
    fetchVariantById: (...args) => gnomadV2VariantQueries.fetchVariantById(...args, 'gnomad'),
    fetchVariantsByGene: (...args) => gnomadV2VariantQueries.fetchVariantsByGene(...args, 'gnomad'),
    fetchVariantsByRegion: (...args) =>
      gnomadV2VariantQueries.fetchVariantsByRegion(...args, 'gnomad'),
    fetchVariantsByTranscript: (...args) =>
      gnomadV2VariantQueries.fetchVariantsByTranscript(...args, 'gnomad'),
    fetchMatchingVariants: (...args) =>
      gnomadV2VariantQueries.fetchMatchingVariants(...args, 'gnomad'),
  },
  exac: exacVariantQueries,
}

const gnomadV2Subsets = ['controls', 'non_neuro', 'non_cancer', 'non_topmed']

gnomadV2Subsets.forEach((subset) => {
  datasetQueries[`gnomad_r2_1_${subset}`] = {
    countVariantsInRegion: (...args) =>
      gnomadV2VariantQueries.countVariantsInRegion(...args, subset),
    fetchVariantById: (...args) => gnomadV2VariantQueries.fetchVariantById(...args, subset),
    fetchVariantsByGene: (...args) => gnomadV2VariantQueries.fetchVariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args) =>
      gnomadV2VariantQueries.fetchVariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args) =>
      gnomadV2VariantQueries.fetchVariantsByTranscript(...args, subset),
    fetchMatchingVariants: (...args) =>
      gnomadV2VariantQueries.fetchMatchingVariants(...args, subset),
  }
})

const gnomadV3Subsets = ['controls_and_biobanks', 'non_cancer', 'non_neuro', 'non_topmed', 'non_v2']

gnomadV3Subsets.forEach((subset) => {
  datasetQueries[`gnomad_r3_${subset}`] = {
    countVariantsInRegion: (...args) =>
      gnomadV3VariantQueries.countVariantsInRegion(...args, subset),
    fetchVariantById: (...args) => gnomadV3VariantQueries.fetchVariantById(...args, subset),
    fetchVariantsByGene: (...args) => gnomadV3VariantQueries.fetchVariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args) =>
      gnomadV3VariantQueries.fetchVariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args) =>
      gnomadV3VariantQueries.fetchVariantsByTranscript(...args, subset),
    fetchMatchingVariants: (...args) =>
      gnomadV3VariantQueries.fetchMatchingVariants(...args, subset),
  }
})

const countVariantsInRegion = (esClient, datasetId, region) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  const query = datasetQueries[datasetId].countVariantsInRegion
  return query(esClient, region)
}

const fetchVariantById = (esClient, datasetId, variantIdOrRsid) => {
  const query = datasetQueries[datasetId].fetchVariantById
  return query(esClient, variantIdOrRsid)
}

const fetchVariantsByGene = (esClient, datasetId, gene) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByGene
  return query(esClient, gene)
}

const fetchVariantsByRegion = (esClient, datasetId, region) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByRegion
  return query(esClient, region)
}

const fetchVariantsByTranscript = (esClient, datasetId, transcript) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByTranscript
  return query(esClient, transcript)
}

const fetchMatchingVariants = (esClient, datasetId, search) => {
  const query = datasetQueries[datasetId].fetchMatchingVariants
  return query(esClient, search)
}

module.exports = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene: withCache(
    fetchVariantsByGene,
    (_, datasetId, gene) => `variants:${datasetId}:gene:${gene.gene_id}`,
    { expiration: 604800 }
  ),
  fetchVariantsByRegion,
  fetchVariantsByTranscript: withCache(
    fetchVariantsByTranscript,
    (_, datasetId, transcript) => `variants:${datasetId}:transcript:${transcript.transcript_id}`,
    { expiration: 3600 }
  ),
  fetchMatchingVariants,
}
