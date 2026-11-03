const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGnomadV4Store } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures')
const TST_GENE_ID = 'ENSG00000128311'
const TST_CDS_INTERVALS = [
  { start: 37011030, stop: 37011325 },
  { start: 37018138, stop: 37018732 },
]
const I32_MAX = 2147483647

describe('gnomAD v4 gene/transcript bindings', () => {
  test('returns unshaped gene source records with snake_case fields and optional missing values', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variants = await store.fetchVariantsInGene(TST_GENE_ID, '22', TST_CDS_INTERVALS, 'all')

    assert.equal(variants.length, 1241)
    const variant = variants[0]
    assert.equal(variant.variant_id, '22-37010956-G-T')
    assert.deepStrictEqual(variant.locus, { contig: 'chr22', position: 37010956 })
    assert.deepStrictEqual(variant.alleles, ['G', 'T'])
    assert.equal(variant.rsids, undefined)
    assert.equal(variant.flags, undefined)
    assert.equal(variant.exome.freq.all.ac, 0)
    assert.equal(variant.exome.freq.all.ac_raw, 2)
    assert.equal(variant.exome.freq.all.an, 1389260)
    assert.equal(variant.exome.freq.non_ukb, undefined)
    assert.deepStrictEqual(variant.exome.filters, ['AC0'])
    assert.ok(variant.exome.freq.all.ancestry_groups.some((population) => population.id === 'XX'))
    assert.equal(typeof variant.exome.freq.all.homozygote_count, 'number')
    assert.ok(Number.isSafeInteger(variant.exome.freq.all.homozygote_count))
    assert.equal(variant.genome.freq.all.ac_raw, undefined)
    assert.equal(variant.joint.freq.all.an, 1541602)
    assert.equal(variant.joint.filters, undefined)
    assert.equal(variant.in_silico_predictors.spliceai_ds_max, 0)
    assert.ok(Number.isFinite(variant.in_silico_predictors.cadd.phred))
    assert.deepStrictEqual(
      variant.transcript_consequences.map((consequence) => consequence.transcript_id),
      ['ENST00000249042', 'NM_003312.6', 'ENST00000403892', 'ENST00000622841', 'NM_001270483.1']
    )
    assert.equal(variant.transcript_consequences[0].hgvsc, 'c.*71C>A')
    assert.equal(variant.transcript_consequences[0].hgvsp, undefined)
    assert.equal(variant.transcript_consequences[0].is_mane_select, true)
    assert.equal(variant.transcript_consequences[2].is_mane_select, false)
    assert.equal(variant.transcript_consequence, undefined)
    assert.equal(variant.chrom, undefined)
  })

  test('queries a noncanonical transcript without removing other consequences or changing cohort keys', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variants = await store.fetchVariantsInTranscript(
      'ENST00000438203',
      '22',
      [{ start: 37018361, stop: 37018732 }],
      'non_ukb'
    )

    assert.equal(variants.length, 572)
    const variant = variants[0]
    assert.equal(variant.variant_id, '22-37018362-A-G')
    assert.equal(variant.exome.freq.all, undefined)
    assert.equal(variant.exome.freq.non_ukb.ac_raw, 2)
    assert.ok(variant.genome.freq.all)
    assert.ok(variant.joint.freq.all)
    assert.equal(variant.genome.freq.non_ukb, undefined)
    assert.equal(variant.joint.freq.non_ukb, undefined)
    assert.deepStrictEqual(
      variant.transcript_consequences.map((consequence) => consequence.transcript_id),
      [
        'ENST00000249042',
        'NM_003312.6',
        'ENST00000403892',
        'ENST00000438203',
        'ENST00000622841',
        'NM_001270483.1',
      ]
    )
    const consequence = variant.transcript_consequences.find(
      (entry) => entry.transcript_id === 'ENST00000438203'
    )
    assert.equal(consequence.hgvsc, 'c.371T>C')
    assert.equal(consequence.hgvsp, 'p.Val124Ala')
  })

  test('returns empty arrays for empty intervals, unknown annotations, and unloaded chromosomes', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)

    assert.deepStrictEqual(await store.fetchVariantsInGene(TST_GENE_ID, '22', [], 'all'), [])
    assert.deepStrictEqual(
      await store.fetchVariantsInTranscript('ENST00000438203', '22', [], 'all'),
      []
    )
    assert.deepStrictEqual(
      await store.fetchVariantsInTranscript('ENST99999999999', '22', TST_CDS_INTERVALS, 'all'),
      []
    )
    assert.deepStrictEqual(
      await store.fetchVariantsInGene(TST_GENE_ID, '1', TST_CDS_INTERVALS, 'all'),
      []
    )
  })

  test('rejects invalid subset and interval arguments at the Node boundary', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInGene(TST_GENE_ID, '22', [], 'unknown'),
      /Invalid gnomAD v4 subset/
    )
    await assert.rejects(
      () => store.fetchVariantsInGene(TST_GENE_ID, '23', [], 'all'),
      /InvalidChromosome/
    )
    await assert.rejects(
      () => store.fetchVariantsInGene(TST_GENE_ID, '22', [{ start: 0, stop: 100 }], 'all'),
      /NonPositiveStart/
    )
    await assert.rejects(
      () =>
        store.fetchVariantsInTranscript(
          'ENST00000438203',
          '22',
          [{ start: 200, stop: 100 }],
          'all'
        ),
      /StopBeforeStart/
    )
  })

  test('propagates reader validation failures as rejected promises', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)

    await assert.rejects(
      () => store.fetchVariantsInGene('', '22', TST_CDS_INTERVALS, 'all'),
      /gene_id must not be empty/
    )
    await assert.rejects(
      () => store.fetchVariantsInTranscript('', '22', TST_CDS_INTERVALS, 'all'),
      /transcript_id must not be empty/
    )
    await assert.rejects(
      () =>
        store.fetchVariantsInTranscript(
          'ENST00000438203',
          '22',
          [{ start: I32_MAX, stop: I32_MAX }],
          'all'
        ),
      /PaddingOverflow/
    )
  })

  test('rejects a root without the gnomAD dataset directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gnomad-v4-node-'))
    try {
      await assert.rejects(() => openGnomadV4Store(root), /gnomad_variants_v4/)
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
