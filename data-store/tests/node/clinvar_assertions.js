const assert = require('node:assert/strict')

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

const assertTranscriptConsequence = (consequence) => {
  assertObjectKeys(consequence, ['transcript_id', 'major_consequence', 'hgvsc', 'hgvsp'])
  Object.values(consequence).forEach((value) => assertNullable(value, assertString))
}

const assertClinvarVariantListEntryShape = (variant) => {
  assertObjectKeys(variant, [
    'variant_id',
    'reference_genome',
    'chrom',
    'pos',
    'ref',
    'alt',
    'clinvar_variation_id',
    'clinical_significance',
    'review_status',
    'gold_stars',
    'in_gnomad',
    'gnomad',
    'transcript_consequence',
  ])
  ;[
    'variant_id',
    'reference_genome',
    'chrom',
    'ref',
    'alt',
    'clinvar_variation_id',
    'clinical_significance',
    'review_status',
  ].forEach((field) => assertString(variant[field]))
  assert.ok(Number.isSafeInteger(variant.pos))
  assert.ok(Number.isSafeInteger(variant.gold_stars))
  assert.strictEqual(typeof variant.in_gnomad, 'boolean')
  assertObjectKeys(variant.gnomad, ['exome', 'genome'])
  assertNullable(variant.gnomad.exome, assertGnomadSequencingData)
  assertNullable(variant.gnomad.genome, assertGnomadSequencingData)
  assertNullable(variant.transcript_consequence, assertTranscriptConsequence)
}

module.exports = { assertClinvarVariantShape, assertClinvarVariantListEntryShape }
