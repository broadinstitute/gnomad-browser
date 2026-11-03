const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGeneStore } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const EXON_KEYS = ['feature_type', 'start', 'stop', 'xstart', 'xstop']

describe('Genes in region bindings', () => {
  test('returns ordered projected genes overlapping the interval', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    const genes = await store.fetchGenesInRegion('22', 37010956, 37018807)
    assert.deepStrictEqual(
      genes.map((gene) => gene.symbol),
      ['TST', 'Y_RNA']
    )

    const gene = genes[0]
    assert.deepStrictEqual(Object.keys(gene).sort(), [
      'exons',
      'gene_id',
      'start',
      'stop',
      'symbol',
      'transcripts',
    ])
    assert.equal(gene.gene_id, 'ENSG00000128311')
    assert.ok(gene.exons.length > 0)
    gene.exons.forEach((exon) => {
      assert.deepStrictEqual(Object.keys(exon).sort(), EXON_KEYS.sort())
      assert.ok(Number.isSafeInteger(exon.xstart) && Number.isSafeInteger(exon.xstop))
    })
    assert.ok(gene.transcripts.length > 0)
    gene.transcripts.forEach((transcript) => {
      assert.deepStrictEqual(Object.keys(transcript).sort(), [
        'exons',
        'start',
        'stop',
        'transcript_id',
      ])
      assert.ok(transcript.exons.length > 0)
    })
    assert.doesNotThrow(() => JSON.stringify(genes))
  })

  test('applies inclusive bounds and chromosome isolation', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    const narrow = await store.fetchGenesInRegion('22', 37010956, 37010958)
    assert.deepStrictEqual(
      narrow.map((gene) => gene.gene_id),
      ['ENSG00000128311']
    )
    const edge = await store.fetchGenesInRegion('22', 37020183, 37020183)
    assert.deepStrictEqual(
      edge.map((gene) => gene.gene_id),
      ['ENSG00000128311']
    )
    assert.deepStrictEqual(await store.fetchGenesInRegion('22', 37020184, 37030000), [])
    assert.deepStrictEqual(await store.fetchGenesInRegion('21', 37010956, 37018807), [])
  })

  test('rejects invalid chromosome and bounds', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    for (const [chromosome, start, stop, message] of [
      ['23', 100, 200, /InvalidChromosome/],
      ['22', 0, 200, /NonPositiveStart/],
      ['22', 200, 100, /StopBeforeStart/],
    ]) {
      await assert.rejects(async () => store.fetchGenesInRegion(chromosome, start, stop), message)
    }
  })
})
