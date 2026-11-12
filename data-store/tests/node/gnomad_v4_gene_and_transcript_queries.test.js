const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGnomadV4Store } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const TTC19 = 'ENSG00000011295'
const TTC19_MANE_SELECT = 'ENST00000261647'
const TTC19_SHORT_TRANSCRIPT = 'ENST00000466729'
const CHROMOSOME = '17'
const TTC19_CDS = [
  { start: 15999784, stop: 16000032 },
  { start: 16000118, stop: 16000382 },
  { start: 16001915, stop: 16002025 },
  { start: 16002657, stop: 16002665 },
  { start: 16002793, stop: 16002831 },
  { start: 16003831, stop: 16003887 },
  { start: 16004201, stop: 16004262 },
  { start: 16006474, stop: 16006568 },
  { start: 16025017, stop: 16025171 },
  { start: 16026540, stop: 16026707 },
  { start: 16027374, stop: 16027519 },
  { start: 16044503, stop: 16044552 },
]

const fetchGeneVariants = async (store, geneId, chromosome, intervals, subset) =>
  JSON.parse(await store.fetchVariantsInGeneJson(geneId, chromosome, intervals, subset))

const fetchTranscriptVariants = async (store, transcriptId, chromosome, intervals, subset) =>
  JSON.parse(await store.fetchVariantsInTranscriptJson(transcriptId, chromosome, intervals, subset))

const findVariant = (variants, variantId) => {
  const variant = variants.find((candidate) => candidate.variant_id === variantId)
  assert.ok(variant, `${variantId} missing from ${variants.map((v) => v.variant_id)}`)
  return variant
}

describe('gnomAD v4 gene and transcript queries', () => {
  test('returns the gene variants in position order', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    const variants = await fetchGeneVariants(store, TTC19, CHROMOSOME, TTC19_CDS, 'all')

    assert.deepStrictEqual(
      variants.map((variant) => variant.variant_id),
      [
        '17-15999784-C-A',
        '17-16000000-G-A',
        '17-16000000-G-T',
        '17-16000000-GC-G',
        '17-16000457-T-C',
        '17-16000457-T-G',
        '17-16000457-TGTCAAG-T',
        '17-16002100-T-G',
        '17-16044627-T-A',
      ]
    )
  })

  test('returns snake_case JSON with missing values as explicit nulls', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    const variants = await fetchGeneVariants(
      store,
      TTC19,
      CHROMOSOME,
      [{ start: 16000457, stop: 16000457 }],
      'all'
    )
    const variant = findVariant(variants, '17-16000457-T-C')

    assert.deepStrictEqual(variant.locus, { contig: 'chr17', position: 16000457 })
    assert.deepStrictEqual(variant.alleles, ['T', 'C'])
    assert.deepStrictEqual(variant.rsids, ['rs960724070'])
    assert.strictEqual(variant.flags, null)
    assert.strictEqual(variant.joint.filters, null)
    assert.deepStrictEqual(variant.exome.filters, [])
    assert.strictEqual(variant.exome.freq.all.ac_raw, 31)
    assert.strictEqual(variant.exome.freq.all.an, 1220484)
    assert.strictEqual(typeof variant.exome.freq.all.homozygote_count, 'number')
    assert.ok(!('non_ukb' in variant.exome.freq))
    assert.strictEqual(variant.genome.freq.all.an, 152214)
    assert.strictEqual(variant.joint.freq.all.an, 1372698)
    assert.strictEqual(typeof variant.joint.fafmax.faf95_max, 'number')
    assert.strictEqual(typeof variant.in_silico_predictors.cadd.phred, 'number')
    assert.strictEqual(variant.in_silico_predictors.revel_max, null)
    assert.deepStrictEqual(
      variant.transcript_consequences.map((consequence) => consequence.transcript_id),
      [
        TTC19_MANE_SELECT,
        'ENST00000583704',
        TTC19_SHORT_TRANSCRIPT,
        'ENST00000470399',
        'ENST00000475723',
        'ENST00000497842',
      ]
    )
    assert.deepStrictEqual(
      variant.exome.freq.all.ancestry_groups.map((group) => group.id),
      ['remaining', 'amr', 'fin', 'mid', 'nfe', 'sas', 'asj', 'eas', 'afr']
    )
    const maneSelect = variant.transcript_consequences.find(
      (consequence) => consequence.transcript_id === TTC19_MANE_SELECT
    )
    assert.strictEqual(maneSelect.is_mane_select, true)
    assert.strictEqual(maneSelect.hgvsc, 'c.312+212T>C')
    assert.strictEqual(maneSelect.hgvsp, null)
  })

  test('selects the non_ukb exome frequencies when asked', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    const variants = await fetchGeneVariants(
      store,
      TTC19,
      CHROMOSOME,
      [{ start: 16000457, stop: 16000457 }],
      'non_ukb'
    )
    const variant = findVariant(variants, '17-16000457-T-C')

    assert.ok(!('all' in variant.exome.freq))
    assert.strictEqual(variant.exome.freq.non_ukb.ac_raw, 9)
    assert.strictEqual(variant.exome.freq.non_ukb.ac, 8)
  })

  test('returns transcript variants only for the requested transcript', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)
    const intervals = [{ start: 15999784, stop: 15999784 }]

    const shortTranscript = await fetchTranscriptVariants(
      store,
      TTC19_SHORT_TRANSCRIPT,
      CHROMOSOME,
      intervals,
      'all'
    )
    const maneSelect = await fetchTranscriptVariants(
      store,
      TTC19_MANE_SELECT,
      CHROMOSOME,
      intervals,
      'all'
    )

    assert.deepStrictEqual(
      shortTranscript.map((variant) => variant.variant_id),
      ['17-15999784-C-A']
    )
    assert.deepStrictEqual(
      shortTranscript[0].transcript_consequences.map((consequence) => consequence.transcript_id),
      [TTC19_SHORT_TRANSCRIPT]
    )
    assert.deepStrictEqual(maneSelect, [])
  })

  test('returns an empty array when no intervals are supplied', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    assert.deepStrictEqual(await fetchGeneVariants(store, TTC19, CHROMOSOME, [], 'all'), [])
    assert.deepStrictEqual(
      await fetchTranscriptVariants(store, TTC19_MANE_SELECT, CHROMOSOME, [], 'all'),
      []
    )
  })

  test('rejects invalid subsets, chromosomes, bounds and IDs', async () => {
    const store = await openGnomadV4Store(FIXTURE_ROOT)

    await assert.rejects(() => store.fetchVariantsInGeneJson(TTC19, CHROMOSOME, TTC19_CDS, 'ukb'), {
      message: /Invalid gnomAD v4 subset: ukb/,
    })
    await assert.rejects(() => store.fetchVariantsInGeneJson(TTC19, '23', TTC19_CDS, 'all'))
    await assert.rejects(() =>
      store.fetchVariantsInGeneJson(TTC19, CHROMOSOME, [{ start: 0, stop: 1 }], 'all')
    )
    await assert.rejects(() =>
      store.fetchVariantsInTranscriptJson(
        TTC19_MANE_SELECT,
        CHROMOSOME,
        [{ start: 2, stop: 1 }],
        'all'
      )
    )
    await assert.rejects(() => store.fetchVariantsInGeneJson('', CHROMOSOME, TTC19_CDS, 'all'))
  })
})

describe('gnomAD v4 store initialization', () => {
  test('rejects opening a missing root', async () => {
    const missingRoot = path.join(__dirname, 'missing-parquet-root')
    await assert.rejects(() => openGnomadV4Store(missingRoot))
  })
})
