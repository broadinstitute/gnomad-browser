const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')

const { openClinvarStore } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures/clinvar_grch38_variants')
const FIXTURE_PATH = path.join(FIXTURE_DIRECTORY, 'chrom=1/data_0.parquet')

test('fetches a variant as a JavaScript object', async () => {
  const store = await openClinvarStore(FIXTURE_PATH)

  const variant = await store.fetchSingleVariant('1-66926-AG-A')

  assert.deepStrictEqual(variant, {
    variant_id: '1-66926-AG-A',
    chrom: '1',
    pos: 66926,
    ref: 'AG',
    alt: 'A',
    reference_genome: 'GRCh38',
    clinvar_variation_id: '3385321',
    clinical_significance: 'Uncertain significance',
    review_status: 'criteria provided, single submitter',
    gold_stars: 1,
    in_gnomad: false,
    last_evaluated: '2024-11-30',
    rsid: null,
    submissions: [
      {
        clinical_significance: 'Uncertain significance',
        last_evaluated: '2024-11-30',
        review_status: 'criteria provided, single submitter',
        submitter_name: 'SN ONGC Dept of Genetics and Molecular biology Vision Research Foundation',
        conditions: [{ name: 'Retinitis pigmentosa', medgen_id: 'C0035334' }],
      },
    ],
    gnomad: { exome: null, genome: null },
  })
})

test('returns nested submissions and exome and genome annotations', async () => {
  const store = await openClinvarStore(FIXTURE_PATH)

  const variant = await store.fetchSingleVariant('1-69134-A-G')

  assert.deepStrictEqual(variant, {
    variant_id: '1-69134-A-G',
    chrom: '1',
    pos: 69134,
    ref: 'A',
    alt: 'G',
    reference_genome: 'GRCh38',
    clinvar_variation_id: '2205837',
    clinical_significance: 'Likely benign',
    review_status: 'criteria provided, single submitter',
    gold_stars: 1,
    in_gnomad: true,
    last_evaluated: '2021-08-23',
    rsid: '781394307',
    submissions: [
      {
        clinical_significance: 'Likely benign',
        last_evaluated: '2021-08-23',
        review_status: 'criteria provided, single submitter',
        submitter_name: 'Ambry Genetics',
        conditions: [{ name: 'not specified', medgen_id: 'CN169374' }],
      },
    ],
    gnomad: {
      exome: { ac: 1373, an: 315270, filters: ['AS_VQSR'] },
      genome: { ac: 10, an: 31428, filters: ['AS_VQSR'] },
    },
  })
})

test('preserves empty filters and a missing genome annotation', async () => {
  const store = await openClinvarStore(FIXTURE_PATH)

  const variant = await store.fetchSingleVariant('1-926026-G-A')

  assert.deepStrictEqual(variant.gnomad, {
    exome: { ac: 3, an: 1457038, filters: [] },
    genome: null,
  })
})

test('reads both chromosomes through one directory-backed store', async () => {
  const store = await openClinvarStore(FIXTURE_DIRECTORY)

  const variants = [
    ['1-1456298-G-A', '1', 'G', 'A'],
    ['2-1456298-C-G', '2', 'C', 'G'],
    ['2-1456298-C-T', '2', 'C', 'T'],
  ]

  await Promise.all(
    variants.map(async ([variantId, chromosome, referenceAllele, alternateAllele]) => {
      const variant = await store.fetchSingleVariant(variantId)

      assert.ok(variant, `fixture variant should exist: ${variantId}`)
      assert.strictEqual(variant.variant_id, variantId)
      assert.strictEqual(variant.chrom, chromosome)
      assert.strictEqual(variant.pos, 1456298)
      assert.strictEqual(variant.ref, referenceAllele)
      assert.strictEqual(variant.alt, alternateAllele)
    })
  )
})

test('returns null for an absent variant', async () => {
  const store = await openClinvarStore(FIXTURE_PATH)
  const variant = await store.fetchSingleVariant('1-926026-G-C')

  assert.strictEqual(variant, null)
})

test('rejects opening a missing file', async () => {
  const missingPath = path.join(__dirname, 'missing-path.parquet')
  await assert.rejects(() => openClinvarStore(missingPath))
})
