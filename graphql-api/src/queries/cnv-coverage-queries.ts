import { UserVisibleError } from '../errors'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './helpers/region-helpers'

import { assertDatasetAndReferenceGenomeMatch } from './helpers/validation-helpers'

const COVERAGE_INDICES = {
  gnomad_cnv_r4: {
    track_callable: 'gnomad_v4_cnv_track_callable_coverage',
    del_burden: 'gnomad_v4_cnv_del_burden',
    dup_burden: 'gnomad_v4_cnv_dup_burden',
  },
}

// ================================================================================================
// Base query
// ================================================================================================

const fetchTrackCallableCoverage = async (esClient: any, { index, contig, regions }: any) => {
  try {
    const response = await esClient.search({
      index,
      type: '_doc',
      size: 10000,
      body: {
        query: {
          bool: {
            filter: [
              { term: { contig } },
              {
                bool: {
                  should: regions.map(({ start, stop }: any) => ({
                    range: { position: { gte: start, lte: stop } },
                  })),
                },
              },
            ],
          },
        },
      },
    })
    return response.body.hits.hits.map((hit: any) => ({
      xpos: hit._source.xpos,
      percent_callable: Math.ceil(parseFloat(hit._source.percent_callable || 0) * 100) / 100,
      position: hit._source.position,
      contig: hit._source.contig
    }))
  } catch (error) {
    throw new Error(`Couldn't fetch coverage, ${error}`)
  }
}


const fetchDelBurdenCoverage = async (esClient: any, { index, contig, regions }: any) => {
  try {
    const response = await esClient.search({
      index,
      type: '_doc',
      size: 10000,
      body: {
        query: {
          bool: {
            filter: [
              { term: { contig } },
              {
                bool: {
                  should: regions.map(({ start, stop }: any) => ({
                    range: { position: { gte: start, lte: stop } },
                  })),
                },
              },
            ],
          },
        },
      },
    })
    return response.body.hits.hits.map((hit: any) => ({
      xpos: hit._source.xpos,
      burden_del: parseFloat(hit._source.burden_del) ,
      position: hit._source.position,
      contig: hit._source.contig
    }))
  } catch (error) {
    throw new Error(`Couldn't fetch coverage, ${error}`)
  }
}

const fetchDupBurdenCoverage = async (esClient: any, { index, contig, regions }: any) => {
  try {
    const response = await esClient.search({
      index,
      type: '_doc',
      size: 10000,
      body: {
        query: {
          bool: {
            filter: [
              { term: { contig } },
              {
                bool: {
                  should: regions.map(({ start, stop }: any) => ({
                    range: { position: { gte: start, lte: stop } },
                  })),
                },
              },
            ],
          },
        },
      },
    })
    return response.body.hits.hits.map((hit: any) => ({
      xpos: hit._source.xpos,
      burden_dup: parseFloat(hit._source.burden_dup) ,
      position: hit._source.position,
      contig: hit._source.contig
    }))
  } catch (error) {
    throw new Error(`Couldn't fetch coverage, ${error}`)
  }
}

// ================================================================================================
// Region queries
// ================================================================================================

export const fetchTrackCallableCoverageForRegion = async (
  esClient: any,
  datasetId: any,
  region: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Track callable coverage is not available for non-CNVs')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const trackCallableCoverageIndex = COVERAGE_INDICES[datasetId]

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  const trackCallableCoverage = await fetchTrackCallableCoverage(esClient, {
    index: trackCallableCoverageIndex,
    contig: region.chrom,
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })

  return trackCallableCoverage
}

export const fetchDelBurdenCoverageForRegion = async (
  esClient: any,
  datasetId: any,
  region: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Deletion burden track coverage is not available for non-CNVs')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const delBurdenCoverageIndex = COVERAGE_INDICES[datasetId]

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  const delBurdenCoverage = await fetchDelBurdenCoverage(esClient, {
    index: delBurdenCoverageIndex,
    contig: region.chrom,
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })

  return delBurdenCoverage
}

export const fetchDupBurdenCoverageForRegion = async (
  esClient: any,
  datasetId: any,
  region: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, region.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Duplication burden track coverage is not available for non-CNVs')
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const dupBurdenCoverageIndex = COVERAGE_INDICES[datasetId]

  const regionSize = region.stop - region.start + 150
  const bucketSize = Math.max(Math.floor(regionSize / 500), 1)

  const dupBurdenCoverage = await fetchDupBurdenCoverage(esClient, {
    index: dupBurdenCoverageIndex,
    regions: [{ start: region.start - 75, stop: region.stop + 75 }],
    bucketSize,
  })

  return dupBurdenCoverage
}

// ================================================================================================
// Gene query
// ================================================================================================

export const _fetchTrackCallableCoverageForGene = async (
  esClient: any,
  datasetId: any,
  gene: any
) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Track callable coverage is not available for non-CNVs')
  }

  const paddedExons = extendRegions(75, gene.exons)

  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )

  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const trackCallableCoverageIndex = COVERAGE_INDICES[datasetId]
  const trackCallableCoverage = await fetchTrackCallableCoverage(esClient, {
    index: trackCallableCoverageIndex,
    contig: gene.chrom,
    regions: mergedExons,
    bucketSize,
  })

  return trackCallableCoverage
}

export const fetchTrackCallableCoverageForGene = _fetchTrackCallableCoverageForGene

export const _fetchDelBurdenCoverageForGene = async (esClient: any, datasetId: any, gene: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Deletion burden track coverage is not available for non-CNVs')
  }

  const paddedExons = extendRegions(75, gene.exons)

  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )

  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const delBurdenCoverageIndex = COVERAGE_INDICES[datasetId]
  const delBurdenCoverage = await fetchDelBurdenCoverage(esClient, {
    index: delBurdenCoverageIndex,
    contig: gene.chrom,
    regions: mergedExons,
    bucketSize,
  })

  return delBurdenCoverage
}

export const fetchDelBurdenCoverageForGene = _fetchDelBurdenCoverageForGene

export const _fetchDupBurdenCoverageForGene = async (esClient: any, datasetId: any, gene: any) => {
  assertDatasetAndReferenceGenomeMatch(datasetId, gene.reference_genome)

  if (!datasetId.startsWith('gnomad_cnv')) {
    throw new UserVisibleError('Duplication burden track coverage is not available for non-CNVs')
  }

  const paddedExons = extendRegions(75, gene.exons)

  const mergedExons = mergeOverlappingRegions(
    paddedExons.sort((a: any, b: any) => a.start - b.start)
  )

  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = Math.max(Math.floor(totalIntervalSize / 500), 1)

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const dupBurdenCoverageIndex = COVERAGE_INDICES[datasetId]
  const dupBurdenCoverage = await fetchDupBurdenCoverage(esClient, {
    index: dupBurdenCoverageIndex,
    regions: mergedExons,
    bucketSize,
  })

  return dupBurdenCoverage
}

export const fetchDupBurdenCoverageForGene = _fetchDupBurdenCoverageForGene
