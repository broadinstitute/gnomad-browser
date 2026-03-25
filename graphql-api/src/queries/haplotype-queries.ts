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

export const fetchMethylationForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number,
  sample?: string
) => {
  const filter: any[] = [
    { term: { chrom } },
    { range: { pos1: { gte: start, lte: stop } } },
  ]
  if (sample) filter.push({ term: { sample_id: sample } })

  const hits = await fetchAllSearchResults(esClient, {
    index: 'gnomad_r4_lr_methylation',
    type: '_doc',
    size: 10000,
    body: { query: { bool: { filter } } },
  })
  return hits.map((hit: any) => hit._source).map((doc: any) => ({
    chr: doc.chrom,
    pos1: doc.pos1,
    pos2: doc.pos2,
    methylation: doc.methylation,
    sample: doc.sample_id,
  }))
}
