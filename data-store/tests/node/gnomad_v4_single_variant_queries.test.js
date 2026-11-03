const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGnomadV4Store } = require('../../bindings')

const FIXTURE_DIRECTORY = path.resolve(__dirname, '../fixtures')
const VARIANT_ID = '22-37010956-G-T'
const VRS_ID = 'ga4gh:VA.mMIsdGBGlAosdyTVhHcgKJc3HyX84oev'

describe('gnomAD v4 single-variant bindings', () => {
  test('returns unshaped source details as nested JavaScript objects', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variant = await store.fetchSingleVariant(VARIANT_ID)

    assert.ok(variant)
    assert.equal(variant.variant_id, VARIANT_ID)
    assert.deepStrictEqual(variant.locus, { contig: 'chr22', position: 37010956 })
    assert.deepStrictEqual(variant.alleles, ['G', 'T'])
    assert.equal(variant.exome.freq.all.ac, 0)
    assert.equal(variant.exome.freq.all.ac_raw, 2)
    assert.equal(variant.exome.freq.all.an, 1389260)
    assert.ok(variant.exome.freq.non_ukb)
    assert.deepStrictEqual(variant.exome.filters, ['AC0'])
    assert.ok(variant.exome.freq.all.ancestry_groups.some((population) => population.id === 'XX'))
    assert.ok(variant.genome.freq.hgdp)
    assert.ok(variant.genome.freq.tgp)
    assert.equal(variant.joint.freq.all.an, 1541602)
    assert.equal(variant.in_silico_predictors.spliceai_ds_max, 0)
    assert.deepStrictEqual(
      variant.transcript_consequences.map((consequence) => consequence.transcript_id),
      ['ENST00000249042', 'NM_003312.6', 'ENST00000403892', 'ENST00000622841', 'NM_001270483.1']
    )
    assert.deepStrictEqual(
      variant.exome.age_distribution.het.bin_freq,
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    )
    assert.deepStrictEqual(
      variant.exome.quality_metrics.allele_balance.alt_raw.bin_freq,
      [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]
    )
    assert.equal(variant.exome.quality_metrics.allele_balance.all_adj, undefined)
    assert.equal(variant.coverage.exome.total_DP, 18566717)
    assert.equal(typeof variant.coverage.exome.total_DP, 'number')
    assert.ok(Number.isSafeInteger(variant.coverage.exome.total_DP))
    assert.equal(variant.coverage.genome.median_approx, 33)
    assert.equal(variant.rsids, undefined)
    assert.equal(variant.caid, undefined)
    assert.equal(variant.flags, undefined)
    assert.equal(variant.chrom, undefined)
    assert.doesNotThrow(() => JSON.stringify(variant))
  })

  test('exposes the singular VRS repeat length and preserves missing values', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const variant = await store.fetchSingleVariant(VARIANT_ID)

    assert.equal(variant.vrs.ref.repeat_subunit_length, 1)
    assert.equal(variant.vrs.ref.repeat_subunit_lengths, undefined)
    assert.equal(variant.vrs.alt.repeat_subunit_length, undefined)
    assert.equal(variant.vrs.alt.allele_id, VRS_ID)
    assert.equal(variant.vrs.alt.start, 37010955)
    assert.equal(variant.vrs.alt.end, 37010956)
    assert.equal(variant.vrs.alt.state, 'T')
  })

  test('supports rsID and alternate VRS ID lookups through the same store', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    const [byVariantId, byVrsId, byRsid] = await Promise.all([
      store.fetchSingleVariant(VARIANT_ID),
      store.fetchSingleVariant(VRS_ID),
      store.fetchSingleVariant('rs1161822213'),
    ])

    assert.deepStrictEqual(byVrsId, byVariantId)
    assert.equal(byRsid.variant_id, '22-37010958-T-A')
  })

  test('returns JavaScript null for absent records', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    for (const identifier of ['22-1-A-G', '1-37010956-G-T', 'rs0', 'ga4gh:VA.absent']) {
      assert.equal(await store.fetchSingleVariant(identifier), null, identifier)
    }
  })

  test('propagates invalid identifiers as rejected promises', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    for (const identifier of ['', 'rs', 'ga4gh:', '22-0-A-G', "22-37010956-G-T' OR true --"]) {
      await assert.rejects(
        () => store.fetchSingleVariant(identifier),
        /Invalid gnomAD v4 variant ID/
      )
    }
  })

  test('rejects non-string arguments at the Node boundary', async () => {
    const store = await openGnomadV4Store(FIXTURE_DIRECTORY)
    for (const identifier of [null, undefined, 123, {}]) {
      await assert.rejects(async () => store.fetchSingleVariant(identifier))
    }
  })

  test('propagates duplicate-record errors instead of returning the first match', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gnomad-v4-single-'))
    const partition = path.join(root, 'gnomad_variants_v4', 'locus.contig=chr22')
    try {
      await fs.mkdir(partition, { recursive: true })
      const fixture = path.join(
        FIXTURE_DIRECTORY,
        'gnomad_variants_v4',
        'locus.contig=chr22',
        'data.parquet'
      )
      await fs.copyFile(fixture, path.join(partition, 'first.parquet'))
      await fs.copyFile(fixture, path.join(partition, 'second.parquet'))
      const store = await openGnomadV4Store(root)
      for (const identifier of [VARIANT_ID, VRS_ID, 'rs1161822213']) {
        await assert.rejects(
          () => store.fetchSingleVariant(identifier),
          /Multiple gnomAD v4 records found/
        )
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
