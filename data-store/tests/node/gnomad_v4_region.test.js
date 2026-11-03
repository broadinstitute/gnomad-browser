const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGnomadV4Store } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures')

describe('gnomAD v4 region bindings', () => {
  test('returns ordered source records within inclusive bounds without padding', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variants = await store.fetchVariantsInRegion('22', 37010956, 37010958, 'all')
    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      ['22-37010956-G-T', '22-37010957-G-T', '22-37010958-T-A', '22-37010958-T-TA']
    )
    const variant = variants[0]
    assert.deepStrictEqual(variant.locus, { contig: 'chr22', position: 37010956 })
    assert.deepStrictEqual(variant.alleles, ['G', 'T'])
    assert.equal(variant.exome.freq.all.ac, 0)
    assert.equal(variant.exome.freq.all.ac_raw, 2)
    assert.equal(variant.exome.freq.non_ukb, undefined)
    assert.equal(variant.flags, undefined)
    assert.equal(variant.joint.filters, undefined)
    assert.equal(variant.transcript_consequences.length, 5)
    assert.equal(typeof variant.exome.freq.all.homozygote_count, 'number')
    assert.doesNotThrow(() => JSON.stringify(variants))
  })

  test('selects non-UKB exome frequencies without changing genome and joint cohorts', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variants = await store.fetchVariantsInRegion('22', 37010958, 37010958, 'non_ukb')
    assert.equal(variants.length, 2)
    assert.equal(variants[1].variant_id, '22-37010958-T-TA')
    assert.equal(variants[1].exome.freq.non_ukb.ac_raw, 5)
    assert.equal(variants[1].exome.freq.all, undefined)
    assert.ok(variants[1].genome.freq.all)
    assert.ok(variants[1].joint.freq.all)
    assert.equal(variants[1].joint.freq.non_ukb, undefined)
  })

  test('returns an empty array for an absent interval or unloaded chromosome', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    assert.deepStrictEqual(await store.fetchVariantsInRegion('22', 1, 2, 'all'), [])
    assert.deepStrictEqual(await store.fetchVariantsInRegion('1', 37010956, 37010958, 'all'), [])
  })

  test('rejects invalid chromosome, bounds and subset arguments', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    for (const [chromosome, start, stop, subset, message] of [
      ['23', 100, 200, 'all', /InvalidChromosome/],
      ['22', 0, 200, 'all', /NonPositiveStart/],
      ['22', 200, 100, 'all', /StopBeforeStart/],
      ['22', 100, 200, 'unknown', /Invalid gnomAD v4 subset/],
    ]) {
      await assert.rejects(
        async () => store.fetchVariantsInRegion(chromosome, start, stop, subset),
        message
      )
    }
  })
})
