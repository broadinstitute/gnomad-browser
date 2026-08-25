// The production builder is CommonJS so release generation can run with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  assertCanonicalComponents,
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
