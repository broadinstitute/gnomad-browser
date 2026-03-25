import { execFile } from 'child_process'
import { promisify } from 'util'
import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const execFileAsync = promisify(execFile)

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

export const fetchMethylationOutliersForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number
) => {
  try {
    const docId = `${chrom}_${start}_${stop}_outliers`
    const response = await esClient.get({
      index: 'gnomad_r4_lr_methylation_outliers',
      type: '_doc',
      id: docId,
    })
    return response.body._source
  } catch (error: any) {
    // Index or doc may not exist yet
    if (error.meta?.statusCode === 404) return null
    console.error(`Error fetching methylation outliers: ${error.message}`)
    return null
  }
}

const GENOHYPE_BIN = process.env.GENOHYPE_BIN || 'genohype'
const GCS_METHYLATION_BUCKET = 'gs://fc-fd42e80c-b41e-4e60-a9cf-b7c0ade168c4/HPRC_assembly/methylation'

// Temporary: shell out to the genohype CLI to query per-sample methylation
// from Tabix-indexed .bed.gz files on GCS. This will be replaced with a
// direct HTTP call to genohype-server once its build is fixed.
const queryGenohypeCli = async (
  sample: string,
  chrom: string,
  start: number,
  stop: number
): Promise<any[]> => {
  const tablePath = `${GCS_METHYLATION_BUCKET}/${sample}.model.pbmm2.combined.bed.gz`
  try {
    const { stdout } = await execFileAsync(GENOHYPE_BIN, [
      'query', tablePath,
      '--where', `chrom=${chrom}`,
      '--where', `begin>=${start}`,
      '--where', `begin<=${stop}`,
      '--json',
    ], { maxBuffer: 10 * 1024 * 1024, timeout: 30000 })

    // genohype --json outputs one JSON object per line (after header lines)
    const lines = stdout.trim().split('\n')
    const records: any[] = []
    for (const line of lines) {
      if (line.startsWith('{')) {
        try {
          records.push(JSON.parse(line))
        } catch {
          // skip non-JSON lines (status output)
        }
      }
    }
    return records
  } catch (error: any) {
    console.error(`genohype query failed for sample ${sample}: ${error.message}`)
    return []
  }
}

export const fetchMethylationForRegion = async (
  esClient: any,
  chrom: string,
  start: number,
  stop: number,
  samples?: string[]
) => {
  if (!samples || samples.length === 0) return []

  const fetchPromises = samples.map(async (sample) => {
    const records = await queryGenohypeCli(sample, chrom, start, stop)
    return records.map((d: any) => ({
      chr: d.chrom || chrom,
      pos1: d.begin,
      pos2: d.end,
      methylation: d.mod_score,
      coverage: d.cov,
      sample,
    }))
  })

  const results = await Promise.all(fetchPromises)
  return results.flat()
}
