import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

export const fetchHaplotypeVariantsForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: 'gnomad_r4_lr_haplotypes',
    type: '_doc',
    size: 10000,
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
