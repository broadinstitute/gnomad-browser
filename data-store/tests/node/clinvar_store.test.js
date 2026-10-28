const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const VARIANT_WITH_GNOMAD_DATA = '1-69134-A-G'
const VARIANT_WITHOUT_GNOMAD_DATA = '1-66926-AG-A'

const assertObjectKeys = (value, keys) => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value))
  assert.deepStrictEqual(Object.keys(value).sort(), [...keys].sort())
}

const assertNullable = (value, checkValue) => {
  assert.notStrictEqual(value, undefined, 'Nullable values must be explicit null, not undefined')
  if (value !== null) {
    checkValue(value)
  }
}

const assertString = (value) => assert.strictEqual(typeof value, 'string')

const assertStringArray = (value) => {
  assert.ok(Array.isArray(value))
  value.forEach(assertString)
}

const assertGnomadSequencingData = (data) => {
  assertObjectKeys(data, ['ac', 'an', 'filters'])
  assert.ok(Number.isSafeInteger(data.ac))
  assert.ok(Number.isSafeInteger(data.an))
  assertStringArray(data.filters)
}

const assertSubmission = (submission) => {
  assertObjectKeys(submission, [
    'clinical_significance',
    'last_evaluated',
    'review_status',
    'submitter_name',
    'conditions',
  ])
  assertNullable(submission.clinical_significance, assertString)
  assertNullable(submission.last_evaluated, assertString)
  assertString(submission.review_status)
  assertString(submission.submitter_name)
  assert.ok(Array.isArray(submission.conditions))
  submission.conditions.forEach((condition) => {
    assertObjectKeys(condition, ['name', 'medgen_id'])
    assertString(condition.name)
    assertNullable(condition.medgen_id, assertString)
  })
}

const assertClinvarVariantShape = (variant) => {
  assertObjectKeys(variant, [
    'variant_id',
    'chrom',
    'pos',
    'ref',
    'alt',
    'reference_genome',
    'clinvar_variation_id',
    'clinical_significance',
    'review_status',
    'gold_stars',
    'in_gnomad',
    'last_evaluated',
    'rsid',
    'submissions',
    'gnomad',
  ])
  ;['variant_id', 'chrom', 'ref', 'alt', 'reference_genome'].forEach((field) =>
    assertString(variant[field])
  )
  ;['clinvar_variation_id', 'clinical_significance', 'review_status'].forEach((field) =>
    assertString(variant[field])
  )
  assert.ok(Number.isSafeInteger(variant.pos))
  assert.ok(Number.isSafeInteger(variant.gold_stars))
  assert.strictEqual(typeof variant.in_gnomad, 'boolean')
  assertNullable(variant.last_evaluated, assertString)
  assertNullable(variant.rsid, assertString)
  assert.ok(Array.isArray(variant.submissions))
  variant.submissions.forEach(assertSubmission)
  assertObjectKeys(variant.gnomad, ['exome', 'genome'])
  assertNullable(variant.gnomad.exome, assertGnomadSequencingData)
  assertNullable(variant.gnomad.genome, assertGnomadSequencingData)
}

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
