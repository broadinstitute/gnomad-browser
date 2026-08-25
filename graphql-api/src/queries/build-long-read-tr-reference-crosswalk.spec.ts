// The production builder is CommonJS so release generation can run with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  assertCanonicalComponents,
  distributionReceipt,
  normalizeCatalogRows,
} = require('../../../development/scripts/build-long-read-tr-reference-crosswalk')

const completeCatalogRow = () => ({
  id: 'TEST',
  gene: { ensembl_id: 'ENSG00000000001', symbol: 'TEST', region: 'coding' },
  associated_diseases: [
    {
      name: 'Test disease',
      symbol: 'TD',
      inheritance_mode: 'Autosomal dominant',
      notes: 'clinically relevant note',
      repeat_size_classifications: [{ classification: 'Pathogenic', min: 10 }],
    },
  ],
  main_reference_region: {
    reference_genome: 'GRCh38',
    chrom: '1',
    start: 1,
    stop: 2,
  },
  reference_regions: [{ reference_genome: 'GRCh38', chrom: '1', start: 1, stop: 2 }],
  reference_repeat_unit: 'A',
  repeat_units: [{ repeat_unit: 'A', classification: 'pathogenic' }],
})

describe('long-read TR reference crosswalk builder invariants', () => {
  test.each(['reference_regions', 'repeat_units'])(
    'rejects missing full transfer field %s',
    (key) => {
      const row: any = completeCatalogRow()
      delete row[key]
      expect(() => normalizeCatalogRows([row])).toThrow(`missing required transfer field ${key}`)
    }
  )

  test('binds notes, ranges, all reference regions, and raw repeat-unit classifications', () => {
    const normalized = normalizeCatalogRows([completeCatalogRow()])[0]
    expect(normalized.associated_diseases[0]).toEqual(
      expect.objectContaining({
        notes: 'clinically relevant note',
        repeat_size_classifications: [{ classification: 'Pathogenic', min: 10, max: null }],
      })
    )
    expect(normalized.reference_regions).toHaveLength(1)
    expect(normalized.repeat_units).toEqual([{ repeat_unit: 'A', classification: 'pathogenic' }])
  })

  test('creates deterministic per-record aggregate distribution receipts', () => {
    const record = {
      ...completeCatalogRow(),
      allele_size_distribution: [
        { repunit: 'A', distribution: [{ repunit_count: 1, frequency: 2 }] },
      ],
      genotype_distribution: [
        {
          short_allele_repunit: 'A',
          long_allele_repunit: 'A',
          distribution: [
            { short_allele_repunit_count: 1, long_allele_repunit_count: 2, frequency: 1 },
          ],
        },
      ],
    }
    expect(distributionReceipt(record)).toEqual({
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      serialized_bytes: expect.any(Number),
      allele_source_rows: 1,
      genotype_source_rows: 1,
      allele_bins: 1,
      genotype_bins: 1,
    })
    expect(distributionReceipt(record)).toEqual(distributionReceipt(structuredClone(record)))
  })

  test('rejects distributions over the hard source-row bound rather than truncating', () => {
    const record = {
      ...completeCatalogRow(),
      allele_size_distribution: Array.from({ length: 1001 }, () => ({ distribution: [] })),
      genotype_distribution: [],
    }
    expect(() => distributionReceipt(record)).toThrow('exceeds a source-row limit')
  })

  test('accepts identity-bearing duplicate ordered components and rejects a wrong tuple', () => {
    const duplicate = {
      canonical_id: '1-1-2-A+1-1-2-A',
      components: [
        { chrom: '1', start0: 1, end0: 2, motif: 'A' },
        { chrom: '1', start0: 1, end0: 2, motif: 'A' },
      ],
    }
    expect(() => assertCanonicalComponents('hgsvc_hprc', duplicate)).not.toThrow()
    expect(() =>
      assertCanonicalComponents('hgsvc_hprc', {
        ...duplicate,
        components: [duplicate.components[0], { ...duplicate.components[1], motif: 'C' }],
      })
    ).toThrow('canonical ID does not equal its ordered components')
  })
})
