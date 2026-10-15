import v5Columns from './y1_primary_schema_v5.json'

// Primary reader subset of checked backend SQL, frozen f982e6ef278e2373851e8514d0c185cce7851303.
// This is a type/receipt admission gate, not full SHOW CREATE attestation or load authorization.
export const y1PrimarySchemaContracts = {
  5: 'y1_full_v5_single_primary_copy_schema_attestation_not_load_authorization',
  6: 'y1_full_v6_nullable_primary_af_schema_attestation_not_load_authorization',
} as const
export type Y1PrimarySchemaVersion = keyof typeof y1PrimarySchemaContracts
export type Y1ColumnRow = { table: string; name: string; type: string; default_kind: string }

export const y1PrimaryColumnRows = (version: Y1PrimarySchemaVersion): Y1ColumnRow[] =>
  Object.entries(v5Columns).flatMap(([table, columns]) =>
    columns.map(([name, type]) => ({
      table,
      name,
      type:
        version === 6 && name === 'af'
          ? (
              {
                lr_y1_summaries: 'Array(Nullable(Float64))',
                lr_y1_alleles: 'Nullable(Float64)',
              } as Record<string, string>
            )[table] || type
          : type,
      default_kind: '',
    }))
  )

export const requireY1PrimaryColumnTypes = (columns: Y1ColumnRow[]): Y1PrimarySchemaVersion => {
  const summaryAf = columns.find(
    (row) => row.table === 'lr_y1_summaries' && row.name === 'af'
  )?.type
  const version =
    summaryAf === 'Array(Float64)' ? 5 : summaryAf === 'Array(Nullable(Float64))' ? 6 : null
  if (!version) throw new Error('Y1 primary schema has unsupported summary AF type')
  for (const [table] of Object.entries(v5Columns)) {
    const actual = columns.filter((row) => row.table === table)
    const expected = y1PrimaryColumnRows(version).filter((row) => row.table === table)
    if (
      actual.length !== expected.length ||
      expected.some((column, index) => {
        const row = actual[index]
        return row?.name !== column.name || row?.type !== column.type || row?.default_kind !== ''
      })
    )
      throw new Error(`Y1 v${version} primary schema column/type/default mismatch for ${table}`)
  }
  return version
}

export const requireY1PrimarySchemaReceipt = (version: Y1PrimarySchemaVersion, receipts: any[]) => {
  // Exactly one physical latest-revision receipt; no FINAL/argMax tie hiding.
  if (
    receipts.length !== 1 ||
    receipts[0].schema_scope !== 'y1_full' ||
    Number(receipts[0].schema_version) !== version ||
    receipts[0].state !== 'applied' ||
    receipts[0].contract !== y1PrimarySchemaContracts[version]
  ) {
    throw new Error(`Y1 v${version} primary schema requires its exact applied schema receipt`)
  }
}
