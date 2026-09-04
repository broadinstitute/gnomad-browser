import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import {
  fetchAlleleNumberForGene,
  fetchAlleleNumberForTranscript,
  fetchExomeAlleleNumberForRegion,
  fetchGenomeAlleleNumberForRegion,
} from './allele-number-queries'

/**
 * A cache double that actually memoizes.
 *
 * The real cache module cannot be loaded here: it pulls in the API config,
 * which requires ELASTICSEARCH_URL, and it would talk to Redis. Memoizing
 * rather than passing calls straight through is deliberate -- it lets
 * "an empty result is never cached" below be a real test.
 */
jest.mock('../cache', () => {
  const entries = new Map<string, any>()
  return {
    clearTestCache: () => entries.clear(),
    withCache: (fn: any, keyFn: any) => async (...args: any[]) => {
      const key = keyFn(...args)
      if (!entries.has(key)) {
        entries.set(key, await fn(...args))
      }
      return entries.get(key)
    },
  }
})

const { clearTestCache } = jest.requireMock('../cache') as any

beforeEach(() => clearTestCache())

// Two PCSK9 exons 101 bases apart. Padding each side by 75 makes them overlap,
// so they merge into the single interval 55039372-55090165 (50793 bases, and
// therefore a bucket size of floor(50793 / 500) = 101).
const gene = {
  gene_id: 'ENSG00000169174',
  reference_genome: 'GRCh38',
  chrom: '1',
  exons: [
    { feature_type: 'CDS', start: 55039447, stop: 55039666, xstart: 1055039447, xstop: 1055039666 },
    { feature_type: 'CDS', start: 55039767, stop: 55090090, xstart: 1055039767, xstop: 1055090090 },
  ],
}

const transcript = { ...gene, transcript_id: 'ENST00000302118' }

const region = { reference_genome: 'GRCh38', chrom: '1', start: 55039447, stop: 55064852 }

/** An Elasticsearch double that records every search it is asked to run. */
const stubEsClient = (bucketsByIndex: { [index: string]: any[] } = {}) => {
  const searches: any[] = []
  return {
    searches,
    client: {
      search: async (params: any) => {
        searches.push(params)
        return {
          body: {
            aggregations: { allele_number: { buckets: bucketsByIndex[params.index] ?? [] } },
          },
        }
      },
    },
  }
}

const failingEsClient = (error: any) => ({
  search: async () => {
    throw error
  },
})

const indexNotFoundError = {
  meta: { statusCode: 404, body: { error: { type: 'index_not_found_exception' } } },
}

const bucket = (key: number, an: number | null, anPercent: number | null) => ({
  key,
  an: { value: an },
  an_percent: { value: anPercent },
})

describe('fetchAlleleNumberForGene', () => {
  test('queries the v4 exome and genome indices', async () => {
    const { searches, client } = stubEsClient()
    await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)

    expect(searches.map((search) => search.index)).toEqual([
      'gnomad_v4_exome_allele_number',
      'gnomad_v4_genome_allele_number',
    ])
    // GRCh38 indices use chr-prefixed contig names.
    expect(searches[0].body.query.bool.filter[0]).toEqual({ term: { 'locus.contig': 'chr1' } })
  })

  test('pads and merges exons the way the coverage query does', async () => {
    const { searches, client } = stubEsClient()
    await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)

    const { filter } = searches[0].body.query.bool
    expect(filter[1].bool.should).toEqual([
      { range: { 'locus.position': { gte: 55039372, lte: 55090165 } } },
    ])
    expect(searches[0].body.aggregations.allele_number.histogram.interval).toEqual(101)
  })

  test('rounds allele number to a whole count and the percentage to three decimals', async () => {
    const { client } = stubEsClient({
      gnomad_v4_exome_allele_number: [bucket(55039447, 1460123.6, 99.87654321)],
      gnomad_v4_genome_allele_number: [bucket(55039447, 152345.2, 99.9191919)],
    })

    expect(await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)).toEqual({
      exome: [{ pos: 55039447, an: 1460124, an_percent: 99.877 }],
      genome: [{ pos: 55039447, an: 152345, an_percent: 99.919 }],
    })
  })

  test('preserves nulls instead of coercing them to zero', async () => {
    const { client } = stubEsClient({
      gnomad_v4_exome_allele_number: [bucket(55039447, null, null)],
    })

    // A bucket covering no indexed base is not a bucket where nobody was
    // called; zero would draw a callability cliff that is not in the data.
    const { exome } = await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)
    expect(exome).toEqual([{ pos: 55039447, an: null, an_percent: null }])
  })
})

describe('fetchAlleleNumberForTranscript', () => {
  test('queries the same indices and intervals as the gene query', async () => {
    const { searches, client } = stubEsClient()
    await fetchAlleleNumberForTranscript(client, 'gnomad_r4', transcript)

    expect(searches.map((search) => search.index)).toEqual([
      'gnomad_v4_exome_allele_number',
      'gnomad_v4_genome_allele_number',
    ])
    expect(searches[0].body.aggregations.allele_number.histogram.interval).toEqual(101)
  })
})

describe('region allele number queries', () => {
  test('fetch exome and genome independently', async () => {
    const { searches, client } = stubEsClient()
    await fetchExomeAlleleNumberForRegion(client, 'gnomad_r4', region)
    await fetchGenomeAlleleNumberForRegion(client, 'gnomad_r4', region)

    expect(searches.map((search) => search.index)).toEqual([
      'gnomad_v4_exome_allele_number',
      'gnomad_v4_genome_allele_number',
    ])
  })

  test('pad the region by 75 bases on each side', async () => {
    const { searches, client } = stubEsClient()
    await fetchExomeAlleleNumberForRegion(client, 'gnomad_r4', region)

    expect(searches[0].body.query.bool.filter[1].bool.should).toEqual([
      { range: { 'locus.position': { gte: 55039372, lte: 55064927 } } },
    ])
    // 25405 bases of region plus 150 of padding, over 500 buckets.
    expect(searches[0].body.aggregations.allele_number.histogram.interval).toEqual(51)
  })
})

describe('datasets without an allele number release', () => {
  test.each([
    ['gnomad_r4_non_ukb', 'GRCh38'],
    ['gnomad_r3', 'GRCh38'],
    ['gnomad_r2_1', 'GRCh37'],
    ['exac', 'GRCh37'],
  ])('%s is rejected rather than served the full callset', async (datasetId, referenceGenome) => {
    const { searches, client } = stubEsClient()

    await expect(
      fetchAlleleNumberForGene(client, datasetId, { ...gene, reference_genome: referenceGenome })
    ).rejects.toThrow('Allele number is not available for')
    expect(searches).toHaveLength(0)
  })
})

describe('when the Elasticsearch index has not been loaded yet', () => {
  test('gene and transcript queries resolve to empty series', async () => {
    const client = failingEsClient(indexNotFoundError)

    // The pipeline may not have run yet. Serving no allele number lets the
    // browser hide the call rate metric instead of failing the whole page.
    expect(await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)).toEqual({
      exome: [],
      genome: [],
    })
    expect(await fetchAlleleNumberForTranscript(client, 'gnomad_r4', transcript)).toEqual({
      exome: [],
      genome: [],
    })
  })

  test('region queries resolve to an empty series', async () => {
    const client = failingEsClient(indexNotFoundError)

    expect(await fetchExomeAlleleNumberForRegion(client, 'gnomad_r4', region)).toEqual([])
  })

  test('the empty result is not cached', async () => {
    // Cache entries have their expiration refreshed on every read, so caching
    // an empty result would outlive the pipeline run that fixes it.
    expect(
      await fetchAlleleNumberForGene(failingEsClient(indexNotFoundError), 'gnomad_r4', gene)
    ).toEqual({ exome: [], genome: [] })

    const { client } = stubEsClient({
      gnomad_v4_exome_allele_number: [bucket(55039447, 1460124, 99.877)],
    })
    const { exome } = await fetchAlleleNumberForGene(client, 'gnomad_r4', gene)
    expect(exome).toEqual([{ pos: 55039447, an: 1460124, an_percent: 99.877 }])
  })

  test('other Elasticsearch failures are not swallowed', async () => {
    const client = failingEsClient(new Error('search_phase_execution_exception'))

    await expect(fetchAlleleNumberForGene(client, 'gnomad_r4', gene)).rejects.toThrow(
      'search_phase_execution_exception'
    )
  })
})
