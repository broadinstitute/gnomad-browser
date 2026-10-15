import {
  y1PrimaryColumnRows,
  y1PrimarySchemaContracts,
  requireY1PrimaryColumnTypes,
  requireY1PrimarySchemaReceipt,
} from './y1_primary_schema'

describe('checked Y1 primary AF schema admission', () => {
  test.each([5, 6] as const)('accepts exact v%s types and receipt', (version) => {
    expect(requireY1PrimaryColumnTypes(y1PrimaryColumnRows(version))).toBe(version)
    expect(() =>
      requireY1PrimarySchemaReceipt(version, [
        {
          schema_scope: 'y1_full',
          schema_version: version,
          state: 'applied',
          contract: y1PrimarySchemaContracts[version],
        },
      ])
    ).not.toThrow()
  })

  test.each([
    ['lr_y1_summaries', 'af', 'Array(Float32)'],
    ['lr_y1_alleles', 'af', 'Float64'],
    ['lr_y1_alleles', 'ac', 'Float64'],
    ['lr_y1_frequencies', 'af', 'Float64'],
    ['lr_y1_frequencies', 'an', 'UInt32'],
  ])('rejects v6 type drift %s.%s', (table, name, type) => {
    const columns = y1PrimaryColumnRows(6)
    columns.find((row) => row.table === table && row.name === name)!.type = type
    expect(() => requireY1PrimaryColumnTypes(columns)).toThrow()
  })

  test('rejects missing, duplicate, reordered, defaulted and unrecognized primary columns', () => {
    const columns = y1PrimaryColumnRows(6)
    for (const changed of [
      columns.slice(1),
      [...columns, columns[0]],
      [columns[1], columns[0], ...columns.slice(2)],
      [{ ...columns[0], default_kind: 'DEFAULT' }, ...columns.slice(1)],
      [...columns, { ...columns[0], name: 'unexpected' }],
    ])
      expect(() => requireY1PrimaryColumnTypes(changed)).toThrow()
  })

  test('rejects absent, duplicate, stale v5, wrong-scope and unapplied v6 receipts', () => {
    const valid = {
      schema_scope: 'y1_full',
      schema_version: 6,
      state: 'applied',
      contract: y1PrimarySchemaContracts[6],
    }
    for (const receipts of [
      [],
      [valid, valid],
      [{ ...valid, schema_version: 5, contract: y1PrimarySchemaContracts[5] }],
      [{ ...valid, schema_scope: 'other' }],
      [{ ...valid, state: 'pending' }],
      [{ ...valid, contract: y1PrimarySchemaContracts[5] }],
    ])
      expect(() => requireY1PrimarySchemaReceipt(6, receipts)).toThrow(
        'exact applied schema receipt'
      )
  })
})
