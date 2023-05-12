import { UserVisibleError } from '../errors'

import gnomadSvV2Queries from './structural-variant-datasets/gnomad-sv-v2-queries'
import gnomadSvV3Queries from './structural-variant-datasets/gnomad-sv-v3-queries'

type QueryArgs = [any, any]

const datasetQueries = {
  gnomad_sv_r2_1: {
    fetchStructuralVariantById: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, 'all'),
    fetchStructuralVariantsByGene: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, 'all'),
    fetchStructuralVariantsByRegion: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, 'all'),
  },
  gnomad_sv_r3: {
    fetchStructuralVariantById: (...args: QueryArgs) =>
      gnomadSvV3Queries.fetchStructuralVariantById(...args),
    fetchStructuralVariantsByGene: (...args: QueryArgs) =>
      gnomadSvV3Queries.fetchStructuralVariantsByGene(...args),
    fetchStructuralVariantsByRegion: (...args: QueryArgs) =>
      gnomadSvV3Queries.fetchStructuralVariantsByRegion(...args),
  },
}

const subsets = ['controls', 'non_neuro']
subsets.forEach((subset) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  datasetQueries[`gnomad_sv_r2_1_${subset}`] = {
    fetchStructuralVariantById: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantById(...args, subset),
    fetchStructuralVariantsByGene: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByGene(...args, subset),
    fetchStructuralVariantsByRegion: (...args: QueryArgs) =>
      gnomadSvV2Queries.fetchStructuralVariantsByRegion(...args, subset),
  }
})

export const fetchStructuralVariantById = (esClient: any, datasetId: any, variantId: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = datasetQueries[datasetId].fetchStructuralVariantById
  return query(esClient, variantId)
}

export const fetchStructuralVariantsByGene = (esClient: any, datasetId: any, gene: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = datasetQueries[datasetId].fetchStructuralVariantsByGene
  return query(esClient, gene)
}

export const fetchStructuralVariantsByRegion = (esClient: any, datasetId: any, region: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const query = datasetQueries[datasetId].fetchStructuralVariantsByRegion
  return query(esClient, region)
}
