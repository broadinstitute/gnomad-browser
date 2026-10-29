const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')
const { assertClinvarVariantListEntryShape } = require('./clinvar_assertions')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const REGION = ['1', 926026, 1477343]
const LIMIT = 1000

describe('ClinVar region queries', () => {
  test('returns list entries as plain objects ordered by position', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variants = await store.fetchVariantsInRegion(...REGION, LIMIT)

    assert.ok(variants.length > 1)
    variants.forEach((variant) => {
      assertClinvarVariantListEntryShape(variant)
      assert.strictEqual(variant.chrom, '1')
    })
    const positions = variants.map((variant) => variant.pos)
    assert.deepStrictEqual(
      positions,
      [...positions].sort((a, b) => a - b)
    )
  })

  test('returns no more than the requested limit', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variants = await store.fetchVariantsInRegion(...REGION, 1)

    assert.strictEqual(variants.length, 1)
  })

  test('counts the variants a region query returns', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variants = await store.fetchVariantsInRegion(...REGION, LIMIT)

    assert.strictEqual(await store.countVariantsInRegion(...REGION), variants.length)
  })

  test('returns an empty array for a region without variants', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    assert.deepStrictEqual(await store.fetchVariantsInRegion('1', 1, 2, LIMIT), [])
  })

  test('rejects invalid chromosomes and bounds', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    await assert.rejects(() => store.fetchVariantsInRegion('chr1', 1, 2, LIMIT))
    await assert.rejects(() => store.fetchVariantsInRegion('1', 0, 2, LIMIT))
    await assert.rejects(() => store.fetchVariantsInRegion('1', 10, 2, LIMIT))
    await assert.rejects(() => store.countVariantsInRegion('1', 0, 2))
  })
})
