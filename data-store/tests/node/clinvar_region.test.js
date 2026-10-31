const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures/clinvar_variants_grch38')

describe('ClinVar region queries', () => {
  test('returns a list entry with GraphQL field names and explicit nulls', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInRegion('1', 66926, 66926)

    assert.deepStrictEqual(variants, [
      {
        variant_id: '1-66926-AG-A',
        reference_genome: 'GRCh38',
        chrom: '1',
        pos: 66926,
        ref: 'AG',
        alt: 'A',
        clinvar_variation_id: '3385321',
        clinical_significance: 'Uncertain significance',
        review_status: 'criteria provided, single submitter',
        gold_stars: 1,
        in_gnomad: false,
        gnomad: { exome: null, genome: null },
        transcript_consequence: {
          transcript_id: 'ENST00000641515',
          major_consequence: 'intron_variant',
          hgvsc: 'c.9+1354del',
          hgvsp: null,
        },
      },
    ])
  })

  test('includes both interval boundaries', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInRegion('1', 1452067, 1452068)

    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      ['1-1452067-C-T', '1-1452068-G-A']
    )
  })

  test('retains multiple alleles without including another chromosome', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInRegion('2', 1456298, 1456298)

    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      ['2-1456298-C-G', '2-1456298-C-T']
    )
    assert.ok(variants.every((variant) => variant.chrom === '2'))
  })

  test('preserves position and variant ID ordering', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInRegion('1', 926026, 1477343)

    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      [
        '1-926026-G-A',
        '1-926026-G-T',
        '1-1452067-C-T',
        '1-1452068-G-A',
        '1-1456298-G-A',
        '1-1460750-A-G',
        '1-1477313-A-G',
        '1-1477317-G-T',
        '1-1477343-A-G',
      ]
    )
  })

  test('returns an empty array when no variants match', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInRegion('1', 1452069, 1452070)

    assert.deepStrictEqual(variants, [])
  })

  test('rejects an invalid chromosome', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(() => store.fetchVariantsInRegion('23', 1, 200), /InvalidChromosome/)
  })

  test('rejects reversed interval bounds', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(() => store.fetchVariantsInRegion('1', 200, 100), /StopBeforeStart/)
  })
})
