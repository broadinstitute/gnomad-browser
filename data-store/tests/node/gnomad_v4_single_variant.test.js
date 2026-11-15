const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGnomadV4Store } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')

const fetchVariant = async (store, variantId) => {
  const json = await store.fetchSingleVariantJson(variantId)
  return json === null ? null : JSON.parse(json)
}

describe('gnomAD v4 single variant', () => {
  test('returns the record as a JSON object with rebuilt identifiers', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    const variant = await fetchVariant(store, '17-16000457-T-C')

    assert.strictEqual(variant.variant_id, '17-16000457-T-C')
    assert.deepStrictEqual(variant.locus, { contig: 'chr17', position: 16000457 })
    assert.deepStrictEqual(variant.alleles, ['T', 'C'])
    assert.deepStrictEqual(variant.rsids, ['rs960724070'])
    assert.strictEqual(variant.caid, 'CA726478728')
    assert.strictEqual(variant.exome.freq.all.ac_raw, 31)
    assert.strictEqual(variant.genome.freq.all.ac_raw, 2)
    assert.strictEqual(variant.coverage.exome.median_approx, 19)
    assert.ok(!('vep115' in variant.exome))
    assert.ok(!('vep115' in variant.genome))
  })

  test('keeps missing values as explicit nulls', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    const variant = await fetchVariant(store, '17-16001839-T-G')

    assert.strictEqual(variant.exome.freq.all.ac_raw, null)
    assert.strictEqual(variant.exome.filters, null)
    assert.strictEqual(variant.genome.freq.all.ac_raw, 1)
  })

  test('returns null for a variant the dataset does not have', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    assert.strictEqual(await store.fetchSingleVariantJson('17-16000457-T-A'), null)
  })

  test('rejects a malformed variant ID', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    await assert.rejects(store.fetchSingleVariantJson('17-16000457-T'), {
      message: /Invalid gnomAD v4 variant ID/,
    })
  })
})
