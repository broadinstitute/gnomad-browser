import { withCache } from '../cache'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'
import gnomadV4VariantQueries from './variant-datasets/gnomad-v4-variant-queries'
import gnomadV3VariantQueries from './variant-datasets/gnomad-v3-variant-queries'
import gnomadV2VariantQueries from './variant-datasets/gnomad-v2-variant-queries'
import exacVariantQueries from './variant-datasets/exac-variant-queries'

type QueryArgs = [any, any]

const datasetQueries: Record<string, any> = {
  gnomad_r4: {
    countVariantsInRegion: (...args: QueryArgs) =>
      gnomadV4VariantQueries.countVariantsInRegion(...args, 'all'),
    fetchVariantById: (...args: QueryArgs) =>
      gnomadV4VariantQueries.fetchVariantById(...args, 'all'),
    fetchVariantsByGene: (...args: QueryArgs) =>
      gnomadV4VariantQueries.fetchVariantsByGene(...args, 'all'),
    fetchVariantsByRegion: (...args: QueryArgs) =>
      gnomadV4VariantQueries.fetchVariantsByRegion(...args, 'all'),
    fetchVariantsByTranscript: (...args: QueryArgs) =>
      gnomadV4VariantQueries.fetchVariantsByTranscript(...args, 'all'),
    fetchMatchingVariants: (...args: QueryArgs) =>
      gnomadV4VariantQueries.fetchMatchingVariants(...args, 'all'),
  },
  gnomad_r3: {
    countVariantsInRegion: (...args: QueryArgs) =>
      gnomadV3VariantQueries.countVariantsInRegion(...args, 'all'),
    fetchVariantById: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantById(...args, 'all'),
    fetchVariantsByGene: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByGene(...args, 'all'),
    fetchVariantsByRegion: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByRegion(...args, 'all'),
    fetchVariantsByTranscript: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByTranscript(...args, 'all'),
    fetchMatchingVariants: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchMatchingVariants(...args, 'all'),
  },
  gnomad_r2_1: {
    countVariantsInRegion: (...args: QueryArgs) =>
      gnomadV2VariantQueries.countVariantsInRegion(...args, 'gnomad'),
    fetchVariantById: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantById(...args, 'gnomad'),
    fetchVariantsByGene: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByGene(...args, 'gnomad'),
    fetchVariantsByRegion: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByRegion(...args, 'gnomad'),
    fetchVariantsByTranscript: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByTranscript(...args, 'gnomad'),
    fetchMatchingVariants: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchMatchingVariants(...args, 'gnomad'),
  },
  exac: exacVariantQueries,
}

type DatasetId = keyof typeof datasetQueries

const gnomadV2Subsets = ['controls', 'non_neuro', 'non_cancer', 'non_topmed']

gnomadV2Subsets.forEach((subset) => {
  datasetQueries[`gnomad_r2_1_${subset}`] = {
    countVariantsInRegion: (...args: QueryArgs) =>
      gnomadV2VariantQueries.countVariantsInRegion(...args, subset),
    fetchVariantById: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantById(...args, subset),
    fetchVariantsByGene: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchVariantsByTranscript(...args, subset),
    fetchMatchingVariants: (...args: QueryArgs) =>
      gnomadV2VariantQueries.fetchMatchingVariants(...args, subset),
  }
})

const gnomadV3Subsets = ['controls_and_biobanks', 'non_cancer', 'non_neuro', 'non_topmed', 'non_v2']

gnomadV3Subsets.forEach((subset) => {
  datasetQueries[`gnomad_r3_${subset}`] = {
    countVariantsInRegion: (...args: QueryArgs) =>
      gnomadV3VariantQueries.countVariantsInRegion(...args, subset),
    fetchVariantById: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantById(...args, subset),
    fetchVariantsByGene: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByRegion(...args, subset),
    fetchVariantsByTranscript: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchVariantsByTranscript(...args, subset),
    fetchMatchingVariants: (...args: QueryArgs) =>
      gnomadV3VariantQueries.fetchMatchingVariants(...args, subset),
  }
})

export const countVariantsInRegion = (esClient: any, datasetId: DatasetId, region: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  const query = datasetQueries[datasetId].countVariantsInRegion
  return query(esClient, region)
}

export const fetchVariantById = (esClient: any, datasetId: DatasetId, variantIdOrRsid: any) => {
  const query = datasetQueries[datasetId].fetchVariantById
  return query(esClient, variantIdOrRsid)
}

const _fetchVariantsByGene = (esClient: any, datasetId: DatasetId, gene: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByGene
  return query(esClient, gene)
}

// export const fetchVariantsByGene = withCache(
//   _fetchVariantsByGene,
//   (_: any, datasetId: DatasetId, gene: any) => `variants:${datasetId}:gene:${gene.gene_id}`,
//   { expiration: 604800 }
// )


export const fetchVariantsByGene = _fetchVariantsByGene // FIXME

export const fetchVariantsByRegion = (esClient: any, datasetId: DatasetId, region: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByRegion
  return query(esClient, region)
}

const _fetchVariantsByTranscript = (esClient: any, datasetId: DatasetId, transcript: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, transcript.reference_genome)

  const query = datasetQueries[datasetId].fetchVariantsByTranscript
  return query(esClient, transcript)
}
export const fetchVariantsByTranscript = withCache(
  _fetchVariantsByTranscript,
  (_: any, datasetId: DatasetId, transcript: any) =>
    `variants:${datasetId}:transcript:${transcript.transcript_id}`,
  { expiration: 3600 }
)

export const fetchMatchingVariants = (esClient: any, datasetId: DatasetId, search: any) => {
  const query = datasetQueries[datasetId].fetchMatchingVariants
  return query(esClient, search)
}
