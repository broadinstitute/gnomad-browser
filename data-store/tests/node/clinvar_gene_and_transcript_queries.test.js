const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')
const { assertClinvarVariantListEntryShape } = require('./clinvar_assertions')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const GENE_ID = 'ENSG00000231482'
const TRANSCRIPT_ID = 'ENST00000423320'
const CHROMOSOME = '2'
const INTERVALS = [{ start: 1453500, stop: 1477400 }]

describe('ClinVar gene and transcript queries', () => {
  test('returns gene list entries with a selected consequence', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variants = await store.fetchVariantsInGene(GENE_ID, CHROMOSOME, INTERVALS)

    assert.ok(variants.length > 0)
    variants.forEach((variant) => {
      assertClinvarVariantListEntryShape(variant)
      assert.notStrictEqual(variant.transcript_consequence, null)
    })
  })

  test('returns transcript list entries with the requested transcript selected', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    const variants = await store.fetchVariantsInTranscript(TRANSCRIPT_ID, CHROMOSOME, INTERVALS)

    assert.ok(variants.length > 0)
    variants.forEach((variant) => {
      assertClinvarVariantListEntryShape(variant)
      assert.strictEqual(variant.transcript_consequence.transcript_id, TRANSCRIPT_ID)
    })
  })

  test('returns an empty array when no intervals are supplied', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    assert.deepStrictEqual(await store.fetchVariantsInGene(GENE_ID, CHROMOSOME, []), [])
    assert.deepStrictEqual(await store.fetchVariantsInTranscript(TRANSCRIPT_ID, CHROMOSOME, []), [])
  })

  test('rejects invalid chromosomes, bounds and IDs', async () => {
    const store = await openClinvarStore(FIXTURE_ROOT)

    await assert.rejects(() => store.fetchVariantsInGene(GENE_ID, '23', []))
    await assert.rejects(() =>
      store.fetchVariantsInGene(GENE_ID, CHROMOSOME, [{ start: 0, stop: 1 }])
    )
    await assert.rejects(() =>
      store.fetchVariantsInTranscript(TRANSCRIPT_ID, CHROMOSOME, [{ start: 2, stop: 1 }])
    )
    await assert.rejects(() => store.fetchVariantsInGene('', CHROMOSOME, INTERVALS))
    await assert.rejects(() => store.fetchVariantsInTranscript('', CHROMOSOME, INTERVALS))
  })
})
