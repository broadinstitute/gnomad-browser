const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')
const { assertClinvarVariantShape } = require('./clinvar_assertions')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const VARIANT_WITH_GNOMAD_DATA = '1-69134-A-G'
const VARIANT_WITHOUT_GNOMAD_DATA = '1-66926-AG-A'

describe('ClinVar single-variant queries', () => {
  test('returns gnomAD exome and genome data as plain objects', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variant = await store.fetchSingleVariant(VARIANT_WITH_GNOMAD_DATA)

    assertClinvarVariantShape(variant)
    assert.strictEqual(variant.variant_id, VARIANT_WITH_GNOMAD_DATA)
    assert.notStrictEqual(variant.gnomad.exome, null)
    assert.notStrictEqual(variant.gnomad.genome, null)
    assert.ok(variant.submissions.length > 0)
  })

  test('returns missing values as null rather than undefined', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variant = await store.fetchSingleVariant(VARIANT_WITHOUT_GNOMAD_DATA)

    assertClinvarVariantShape(variant)
    assert.strictEqual(variant.rsid, null)
    assert.deepStrictEqual(variant.gnomad, { exome: null, genome: null })
  })

  test('returns null for an absent variant', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    assert.strictEqual(await store.fetchSingleVariant('1-1-A-C'), null)
  })

  test('rejects a malformed variant ID instead of returning null', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    await assert.rejects(() => store.fetchSingleVariant('1-100-A'), {
      message: /Invalid ClinVar variant ID/,
    })
  })
})

describe('ClinVar store initialization', () => {
  test('rejects opening a missing root', async () => {
    const missingRoot = path.join(__dirname, 'missing-parquet-root')
    await assert.rejects(() => openClinvarStore(missingRoot))
  })
})
