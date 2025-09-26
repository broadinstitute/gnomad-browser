type GnomadVersion = 'ExAC' | 'v2'

const GNOMAD_LOF_CURATION_RESULTS_INDICES: Record<GnomadVersion, string> = {
  ExAC: 'gnomad_v2_lof_curation_results',
  v2: 'gnomad_v2_lof_curation_results',
}

type LoFCuration = {
  gene_id: string
  gene_version: string
  gene_symbol: string | null
  verdict: string
  flags: string[] | null
  project: string
}

type LoFCurationForVariant = {
  variant_id: string
  lof_curations: LoFCuration[]
}

// ================================================================================================
// Variant query
// ================================================================================================

export const fetchLofCurationResultsByVariant = async (
  esClient: any,
  gnomadVersion: GnomadVersion,
  variantId: string
) => {
  const response = await esClient.search({
    index: GNOMAD_LOF_CURATION_RESULTS_INDICES[gnomadVersion],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    return null
  }

  return response.body.hits.hits[0]._source.value.lof_curations
}

// ================================================================================================
// Gene query
// ================================================================================================
type Gene = {
  gene_id: string
}

export const fetchLofCurationResultsByGene = async (
  esClient: any,
  gnomadVersion: GnomadVersion,
  gene: Gene
) => {
  const response = await esClient.search({
    index: GNOMAD_LOF_CURATION_RESULTS_INDICES[gnomadVersion],
    type: '_doc',
    size: 1000,
    body: {
      query: {
        bool: {
          filter: {
            term: {
              gene_id: gene.gene_id,
            },
          },
        },
      },
    },
  })

  const lofCurations: LoFCurationForVariant[] = response.body.hits.hits.map(
    (doc: any) => doc._source.value
  )

  return lofCurations
}

// ================================================================================================
// Region query
// ================================================================================================
type Region = {
  chrom: string
  start: number
  stop: number
}

export const fetchLofCurationResultsByRegion = async (
  esClient: any,
  gnomadVersion: GnomadVersion,
  region: Region
) => {
  const response = await esClient.search({
    index: GNOMAD_LOF_CURATION_RESULTS_INDICES[gnomadVersion],
    type: '_doc',
    size: 1000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': region.chrom } },
            {
              range: {
                'locus.position': {
                  gte: region.start,
                  lte: region.stop,
                },
              },
            },
          ],
        },
      },
    },
  })

  const lofCurations: LoFCurationForVariant[] = response.body.hits.hits.map(
    (doc: any) => doc._source.value
  )

  return lofCurations
}
