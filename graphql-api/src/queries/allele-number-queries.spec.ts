import { jest, describe, expect, test } from '@jest/globals'

// The module under test imports withCache, which pulls in config.ts and its
// required ELASTICSEARCH_URL. The tests exercise the uncached `_fetch*` export, so
// the cache is stubbed rather than adding a jest setup file that fakes API config
// for every graphql-api suite.
jest.mock('../cache', () => ({
  withCache: (fn: any) => fn,
}))

// eslint-disable-next-line import/first
import { _fetchAlleleNumberForGene } from './allele-number-queries'

const gene = {
  gene_id: 'ENSG00000169174',
  reference_genome: 'GRCh38',
  chrom: '1',
  exons: [{ start: 55039447, stop: 55039747, feature_type: 'CDS' }],
}

/** Records the searches it is asked to run and replays canned aggregation buckets. */
const stubEsClient = (bucketsByIndex: { [index: string]: any[] }) => {
  const searches: any[] = []
  return {
    searches,
    client: {
      search: async (params: any) => {
        searches.push(params)
        return {
          body: {
            aggregations: {
              allele_number: { buckets: bucketsByIndex[params.index] ?? [] },
            },
          },
        }
      },
    },
  }
}

const bucket = (key: number, an: number | null, anPercent: number | null) => ({
  key,
  an: { value: an },
  an_percent: { value: anPercent },
})

describe('fetchAlleleNumberForGene', () => {
  test('queries the v4 exome and genome indices', async () => {
    const { searches, client } = stubEsClient({})
    await _fetchAlleleNumberForGene(client, 'gnomad_r4', gene)

    expect(searches.map((s) => s.index)).toEqual([
      'gnomad_v4_exome_allele_number',
      'gnomad_v4_genome_allele_number',
    ])
    // GRCh38 datasets are indexed with a chr prefix.
    expect(searches[0].body.query.bool.filter[0]).toEqual({ term: { 'locus.contig': 'chr1' } })
  })

  test('returns empty series for a dataset with no allele number index', async () => {
    const { searches, client } = stubEsClient({})
    // v2 and ExAC have no AN release. Returning empty rather than throwing is what
    // lets the browser hide the AN metrics instead of failing the whole page.
    const results = await Promise.all(
      (['gnomad_r2_1', 'exac', 'gnomad_r3'] as const).map((datasetId) =>
        _fetchAlleleNumberForGene(client, datasetId, {
          ...gene,
          reference_genome: datasetId === 'gnomad_r3' ? 'GRCh38' : 'GRCh37',
        })
      )
    )
    results.forEach((result) => expect(result).toEqual({ exome: [], genome: [] }))
    expect(searches).toHaveLength(0)
  })

  test('rounds AN to a whole count and AN% to three decimals', async () => {
    const { client } = stubEsClient({
      gnomad_v4_exome_allele_number: [bucket(55039447, 1460123.6, 99.87654321)],
      gnomad_v4_genome_allele_number: [bucket(55039447, 152345.2, 99.9191919)],
    })
    const result = await _fetchAlleleNumberForGene(client, 'gnomad_r4', gene)

    // AN is a count of alleles, so a fractional bucket average is not meaningful.
    expect(result.exome).toEqual([{ pos: 55039447, an: 1460124, an_percent: 99.877 }])
    expect(result.genome).toEqual([{ pos: 55039447, an: 152345, an_percent: 99.919 }])
  })

  test('preserves nulls instead of coercing them to zero', async () => {
    const { client } = stubEsClient({
      gnomad_v4_exome_allele_number: [bucket(55039447, null, null)],
    })
    const result = await _fetchAlleleNumberForGene(client, 'gnomad_r4', gene)

    // A bucket with no documents is not the same as a bucket where nobody was
    // called. Zero would draw a callability cliff that is not in the data -- the
    // coverage track's `|| 0` has exactly that failure mode.
    expect(result.exome).toEqual([{ pos: 55039447, an: null, an_percent: null }])
  })

  test('rejects subsets, which have no allele number release', async () => {
    const { client } = stubEsClient({})
    await expect(
      _fetchAlleleNumberForGene(client, 'gnomad_r2_1_controls', {
        ...gene,
        reference_genome: 'GRCh37',
      })
    ).rejects.toThrow('Allele number is not available for subsets')
  })
})
