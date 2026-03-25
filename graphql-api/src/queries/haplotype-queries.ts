import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

// Cap the number of variant docs fetched to prevent OOM on large regions.
// 710K docs in a 1MB region is too much; 100K is ~150kb worth of data which
// is plenty for haplotype grouping visualization.
const MAX_HAPLOTYPE_DOCS = 100000

export const fetchHaplotypeVariantsForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const allResults: any[] = []
  const size = 10000
  const scroll = '30s'

  let response = await esClient.search({
    index: 'gnomad_r4_lr_haplotypes',
    type: '_doc',
    scroll,
    size,
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            { range: { position: { gte: start, lte: stop } } },
          ],
        },
      },
    },
  })

  allResults.push(...response.body.hits.hits)

  while (
    allResults.length < response.body.hits.total.value &&
    allResults.length < MAX_HAPLOTYPE_DOCS
  ) {
    response = await esClient.scroll({
      scroll,
      scrollId: response.body._scroll_id,
    })
    allResults.push(...response.body.hits.hits)
  }

  await esClient.clearScroll({ scrollId: response.body._scroll_id })

  return allResults.slice(0, MAX_HAPLOTYPE_DOCS).map((hit: any) => hit._source)
}

export const fetchLRCoverageForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: 'gnomad_r4_lr_coverage',
    type: '_doc',
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            { range: { pos: { gte: start, lte: stop } } },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })
  return hits.map((hit: any) => hit._source)
}

export const fetchMethylationSummaryForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: 'gnomad_r4_lr_methylation_summary',
    type: '_doc',
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            { range: { pos1: { gte: start, lte: stop } } },
          ],
        },
      },
      sort: [{ pos1: { order: 'asc' } }],
    },
  })
  return hits.map((hit: any) => hit._source)
}

const GENOHYPE_BASE_URL = process.env.GENOHYPE_URL || 'http://hail-server:3000'
const GCS_METHYLATION_BUCKET = 'gs://fc-fd42e80c-b41e-4e60-a9cf-b7c0ade168c4/HPRC_assembly/methylation'

export const fetchMethylationForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number,
  samples?: string[]
) => {
  if (!samples || samples.length === 0) return []

  const fetchPromises = samples.map(async (sample) => {
    const tablePath = `${GCS_METHYLATION_BUCKET}/${sample}.model.pbmm2.combined.bed.gz`
    const url = `${GENOHYPE_BASE_URL}/api/query?table=${encodeURIComponent(tablePath)}&interval=${chrom}:${start}-${stop}&format=json`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Genohype returned ${response.status} for sample ${sample}`)
        return []
      }
      const data = await response.json()
      return data.map((d: any) => ({
        chr: d.chrom || chrom,
        pos1: d.pos1,
        pos2: d.pos2,
        methylation: d.methylation,
        coverage: d.coverage,
        sample,
      }))
    } catch (error) {
      console.error(`Failed to fetch methylation for sample ${sample}:`, error)
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  return results.flat()
}
