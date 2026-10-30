const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openClinvarStore } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures/clinvar_grch38_variants')
const I32_MAX = 2147483647

describe('ClinVar gene queries', () => {
  test('returns complete list entries with the requested gene consequence and explicit nulls', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInGene('ENSG00000231482', '2', [
      { start: 1453592, stop: 1453592 },
    ])

    assert.deepStrictEqual(variants, [
      {
        variant_id: '2-1453592-A-G',
        reference_genome: 'GRCh38',
        chrom: '2',
        pos: 1453592,
        ref: 'A',
        alt: 'G',
        clinvar_variation_id: '1271212',
        clinical_significance: 'Benign',
        review_status: 'criteria provided, multiple submitters, no conflicts',
        gold_stars: 2,
        in_gnomad: true,
        gnomad: {
          exome: { ac: 1356501, an: 1437888, filters: [] },
          genome: { ac: 140516, an: 152214, filters: [] },
        },
        transcript_consequence: {
          transcript_id: 'ENST00000650512',
          major_consequence: 'intron_variant',
          hgvsc: 'n.548-35131T>C',
          hgvsp: null,
        },
      },
    ])
    assert.notStrictEqual(
      variants[0].transcript_consequence.transcript_id,
      'ENST00000329066',
      'the first consequence belongs to another gene and must not be selected'
    )
  })

  test('accepts multiple unpadded intervals, sorts results, and excludes the gap', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInGene('ENSG00000215915', '1', [
      { start: 1460750, stop: 1460750 },
      { start: 1451992, stop: 1451992 },
    ])
    const variantIds = variants.map((variant) => variant.variant_id)

    assert.deepStrictEqual(variantIds, ['1-1452067-C-T', '1-1460750-A-G'])
    assert.ok(
      !variantIds.includes('1-1456298-G-A'),
      'the matching gene variant in the gap between padded intervals must be excluded'
    )
    assert.ok(
      !variantIds.includes('1-1452068-G-A'),
      'the first padded interval stops at 1452067, so position 1452068 must be excluded'
    )
  })

  test('does not duplicate records covered by overlapping padded intervals', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInGene('ENSG00000215915', '1', [
      { start: 1452067, stop: 1452067 },
      { start: 1452068, stop: 1452068 },
    ])

    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      ['1-1452067-C-T', '1-1452068-G-A']
    )
  })

  test('returns an empty array when no intervals are supplied', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    assert.deepStrictEqual(await store.fetchVariantsInGene('ENSG00000215915', '1', []), [])
  })

  test('rejects an invalid chromosome even when the interval array is empty', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInGene('ENSG00000215915', '23', []),
      /InvalidChromosome/
    )
  })

  test('rejects nonpositive interval starts', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInGene('ENSG00000215915', '1', [{ start: 0, stop: 100 }]),
      /NonPositiveStart/
    )
  })

  test('rejects an empty gene ID', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInGene('', '1', [{ start: 100, stop: 200 }]),
      /gene_id must not be empty/
    )
  })
})

describe('ClinVar transcript queries', () => {
  test('requires the requested transcript and selects its consequence instead of the first', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInTranscript('ENST00000423320', '2', [
      { start: 1453500, stop: 1477400 },
    ])
    const variantIds = variants.map((variant) => variant.variant_id)

    assert.deepStrictEqual(variantIds, ['2-1453592-A-G'])
    assert.deepStrictEqual(variants[0].transcript_consequence, {
      transcript_id: 'ENST00000423320',
      major_consequence: 'intron_variant',
      hgvsc: 'c.483-102A>G',
      hgvsp: null,
    })
    assert.notStrictEqual(
      variants[0].transcript_consequence.transcript_id,
      'ENST00000329066',
      'the first transcript consequence is not the requested transcript'
    )
    const excludedVariantIds = [
      '2-1456298-C-G',
      '2-1456298-C-T',
      '2-1476904-G-C',
      '2-1477313-G-A',
      '2-1477317-C-T',
      '2-1477343-C-T',
    ]
    excludedVariantIds.forEach((variantId) => {
      assert.ok(
        !variantIds.includes(variantId),
        `${variantId} lacks the requested transcript despite lying inside the interval`
      )
    })
  })

  test('accepts multiple unpadded intervals and excludes matching records in the gap', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInTranscript('ENST00000378785', '1', [
      { start: 1451992, stop: 1451992 },
      { start: 1460750, stop: 1460750 },
    ])
    const variantIds = variants.map((variant) => variant.variant_id)

    assert.deepStrictEqual(variantIds, ['1-1452067-C-T', '1-1460750-A-G'])
    assert.ok(
      !variantIds.includes('1-1456298-G-A'),
      'the matching transcript variant in the gap between padded intervals must be excluded'
    )
  })

  test('returns an empty array for an unknown transcript', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    const variants = await store.fetchVariantsInTranscript('ENST99999999999', '1', [
      { start: 1452067, stop: 1477343 },
    ])

    assert.deepStrictEqual(variants, [])
    assert.ok(
      !variants.some((variant) => variant.variant_id === '1-1452067-C-T'),
      'the fixture variant is not annotated to the unknown transcript'
    )
  })

  test('returns an empty array when no intervals are supplied', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    assert.deepStrictEqual(await store.fetchVariantsInTranscript('ENST00000378785', '1', []), [])
  })

  test('rejects reversed interval bounds', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInTranscript('ENST00000378785', '1', [{ start: 200, stop: 100 }]),
      /StopBeforeStart/
    )
  })

  test('rejects an empty transcript ID', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInTranscript('', '1', [{ start: 100, stop: 200 }]),
      /transcript_id must not be empty/
    )
  })

  test('propagates padding overflow as a rejected promise', async () => {
    const store = await openClinvarStore(FIXTURE_DIRECTORY)

    await assert.rejects(
      () =>
        store.fetchVariantsInTranscript('ENST00000378785', '1', [
          { start: I32_MAX, stop: I32_MAX },
        ]),
      /PaddingOverflow/
    )
  })
})
