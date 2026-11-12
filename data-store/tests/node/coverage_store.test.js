const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openCoverageStore } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const TTC19 = 'ENSG00000011295'
const CHROMOSOME = '17'

describe('coverage store', () => {
  test('returns the bucket size and snake_case buckets with every average', async () => {
    const store = await openCoverageStore(FIXTURE_ROOT, 'gnomad_v4_exome')

    const histogram = await store.fetchCoverageInGene(TTC19, CHROMOSOME, [
      { start: 16044503, stop: 16044503 },
    ])

    assert.strictEqual(histogram.bucket_size, 1)
    assert.strictEqual(histogram.buckets.length, 151)
    const [firstBucket] = histogram.buckets
    assert.deepStrictEqual(Object.keys(firstBucket), [
      'bucket_start',
      'mean',
      'median',
      'over_1',
      'over_5',
      'over_10',
      'over_15',
      'over_20',
      'over_25',
      'over_30',
      'over_50',
      'over_100',
    ])
    assert.strictEqual(firstBucket.bucket_start, 16044428)
    assert.ok(Object.values(firstBucket).every((value) => typeof value === 'number'))
  })

  test('aligns buckets to multiples of the bucket size', async () => {
    const store = await openCoverageStore(FIXTURE_ROOT, 'gnomad_v4_exome')

    const histogram = await store.fetchCoverageInGene(TTC19, CHROMOSOME, [
      { start: 16026540, stop: 16028786 },
    ])

    assert.strictEqual(histogram.bucket_size, 4)
    assert.ok(histogram.buckets.length > 0)
    assert.ok(histogram.buckets.every((bucket) => bucket.bucket_start % 4 === 0))
  })

  test('returns no buckets for no exons', async () => {
    const store = await openCoverageStore(FIXTURE_ROOT, 'gnomad_v4_exome')

    const histogram = await store.fetchCoverageInGene(TTC19, CHROMOSOME, [])

    assert.deepStrictEqual(histogram.buckets, [])
  })

  test('rejects an unknown dataset', async () => {
    await assert.rejects(openCoverageStore(FIXTURE_ROOT, 'gnomad_v3_genome'), {
      message: /Invalid coverage dataset: gnomad_v3_genome/,
    })
  })

  test('rejects an invalid chromosome', async () => {
    const store = await openCoverageStore(FIXTURE_ROOT, 'gnomad_v4_exome')

    await assert.rejects(
      store.fetchCoverageInGene(TTC19, 'chr17', [{ start: 16044503, stop: 16044503 }]),
      { message: /Invalid genomic interval/ }
    )
  })
})
