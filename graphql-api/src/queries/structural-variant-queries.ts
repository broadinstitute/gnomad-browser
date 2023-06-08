import { UserVisibleError } from '../errors'

import gnomadSvV2Queries from './structural-variant-datasets/gnomad-sv-v2-queries'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'

type QueryArgs = [any, any]

const subsets = ['controls', 'non_neuro'] as const
export type V2Subset = 'all' | (typeof subsets)[number]
type SvDatasetId = 'gnomad_sv_r2_1' | 'gnomad_sv_r2_1_controls' | 'gnomad_sv_r2_1_non_neuro'

type QueriesForDataset = {
  fetchStructuralVariantById: any
  fetchStructuralVariantsByGene: any
  fetchStructuralVariantsByRegion: any
}

const datasetQueries: Record<SvDatasetId, QueriesForDataset> = {
  gnomad_sv_r2_1: {
    fetchStructuralVariantById: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, 'all'),
    fetchStructuralVariantsByGene: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, 'all'),
    fetchStructuralVariantsByRegion: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, 'all'),
  },
} as Record<SvDatasetId, QueriesForDataset>

subsets.forEach((subset) => {
  datasetQueries[`gnomad_sv_r2_1_${subset}`] = {
    fetchStructuralVariantById: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, subset),
    fetchStructuralVariantsByGene: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, subset),
    fetchStructuralVariantsByRegion: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, subset),
  }
})

export const fetchStructuralVariantById = (
  esClient: any,
  datasetId: SvDatasetId,
  variantId: any
) => {
  const query = datasetQueries[datasetId].fetchStructuralVariantById
  return query(esClient, variantId)
}

export const fetchStructuralVariantsByGene = (esClient: any, datasetId: DatasetId, gene: any) => {
  if (gene.reference_genome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${gene.reference_genome}`
    )
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = datasetQueries[datasetId].fetchStructuralVariantsByGene
  return query(esClient, gene)
}

export const fetchStructuralVariantsByRegion = (
  esClient: any,
  datasetId: DatasetId,
  region: any
) => {
  if (region.reference_genome !== 'GRCh37') {
    throw new UserVisibleError(
      `gnomAD v2 structural variants are not available on ${region.reference_genome}`
    )
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = datasetQueries[datasetId].fetchStructuralVariantsByRegion
  return query(esClient, region)
}
