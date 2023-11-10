import { withCache } from '../cache'
import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'
import gnomadV3MitochondrialVariantQueries from './mitochondrial-variant-datasets/gnomad-v3-mitochondrial-variant-queries'

const datasetQueries = {
  gnomad_r4: {
    fetchMitochondrialVariantById:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantById,
    _fetchMitochondrialVariantsByGene:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByGene,
    fetchMitochondrialVariantsByRegion:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByRegion,
  },
  gnomad_r3: {
    fetchMitochondrialVariantById:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantById,
    _fetchMitochondrialVariantsByGene:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByGene,
    fetchMitochondrialVariantsByRegion:
      gnomadV3MitochondrialVariantQueries.fetchMitochondrialVariantsByRegion,
  },
}

type DatasetId = keyof typeof DATASET_LABELS

export const fetchMitochondrialVariantById = (
  esClient: any,
  datasetId: DatasetId,
  variantIdOrRsid: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = (datasetQueries[datasetId] || {}).fetchMitochondrialVariantById
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  return query(esClient, variantIdOrRsid)
}

const _fetchMitochondrialVariantsByGene = (esClient: any, datasetId: DatasetId, gene: any) => {
  if (gene.chrom !== 'M') {
    throw new UserVisibleError('Mitochondrial variants are only available for mitochondrial genes')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = (datasetQueries[datasetId] || {})._fetchMitochondrialVariantsByGene
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  return query(esClient, gene)
}
export const fetchMitochondrialVariantsByGene = withCache(
  _fetchMitochondrialVariantsByGene,
  (_: any, datasetId: any, gene: any) => `mt_variants:${datasetId}:gene:${gene.gene_id}`,
  { expiration: 86400 }
)

export const fetchMitochondrialVariantsByRegion = (
  esClient: any,
  datasetId: DatasetId,
  region: any
) => {
  if (region.chrom !== 'M') {
    throw new UserVisibleError('Mitochondrial variants are only available for mitochondrial region')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = (datasetQueries[datasetId] || {}).fetchMitochondrialVariantsByRegion
  if (!query) {
    throw new UserVisibleError(
      `Mitochondrial variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  return query(esClient, region)
}

export const fetchMitochondrialVariantsByTranscript = (
  esClient: any,
  datasetId: any,
  transcript: any
) => {
  // Mitochondrial genes only have one transcript, so gene and transcript queries are equivalent.
  return _fetchMitochondrialVariantsByGene(esClient, datasetId, transcript.gene)
}
