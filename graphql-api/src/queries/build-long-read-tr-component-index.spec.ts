import { Readable } from 'node:stream'

// Production release builder is CommonJS so it can stream with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  buildExtractionQuery,
  buildIndex,
  catalogRowKey,
  motifRelation,
  parseTrid,
  validateManifestBundle,
} = require('../../../development/scripts/build-long-read-tr-component-index')

const catalogRow = () => ({
  id: 'TEST',
  gene: { ensembl_id: 'ENSG00000000001', symbol: 'TEST', region: 'coding' },
  associated_diseases: [],
  main_reference_region: { reference_genome: 'GRCh38', chrom: '1', start: 10, stop: 20 },
  reference_regions: [{ reference_genome: 'GRCh38', chrom: '1', start: 10, stop: 20 }],
  reference_repeat_unit: 'AAG',
  repeat_units: [{ repeat_unit: 'AAG', classification: 'pathogenic' }],
  stripy_id: 'TEST',
  strchive_id: 'TEST_TEST',
})

const manifests = () => ({
  schema_version: 1,
  entries: ['aou', 'hgsvc_hprc'].flatMap((cohort) =>
    [...Array(22).keys(), 'X', 'Y'].map((value) => {
      const chrom = `chr${typeof value === 'number' ? value + 1 : value}`
      return { cohort, chrom, run_id: `${cohort}-${chrom}-run` }
    })
  ),
})

const completeRows = () =>
  manifests().entries.map((source: any, index) => {
    let trid = `${source.chrom.slice(3)}-${100 + index}-${110 + index}-A`
    if (source.chrom === 'chr1') {
      trid = index < 24 ? '1-10-20-AAG' : '1-9-12-AAG,1-30-40-AAG,1-30-40-AAG'
    }
    return {
      cohort: source.cohort,
      chrom: source.chrom,
      run_id: source.run_id,
      position: 100 + index,
      source_record_id: `${source.cohort}-${source.chrom}-record`,
      trid,
    }
  })

const sortedInput = (rows: any[]) => {
  const data = rows
    .map((row) => ({
      row_type: 'DATA',
      ...row,
      canonical: parseTrid(row.trid).canonicalId,
      sortKey: [
        row.cohort,
        parseTrid(row.trid).canonicalId,
        row.source_record_id,
        row.run_id,
        row.chrom,
        String(row.position).padStart(12, '0'),
      ].join('\u0000'),
    }))
    .sort((left, right) => {
      if (left.sortKey < right.sortKey) return -1
      if (left.sortKey > right.sortKey) return 1
      return 0
    })
    .map(({ canonical: _canonical, sortKey: _sortKey, ...row }) => JSON.stringify(row))
  const completion = JSON.stringify({
    row_type: 'COMPLETE',
    expected_source_records: rows.length,
    expected_ordered_components: rows.reduce(
      (total, row) => total + parseTrid(row.trid).components.length,
      0
    ),
  })
  return `${[...data, completion].join('\n')}\n`
}

const runBuild = async (rows = completeRows()) => {
  const expectedSources = validateManifestBundle(manifests())
  const query = buildExtractionQuery('release_db', expectedSources)
  return buildIndex({
    inputStream: Readable.from(sortedInput(rows)),
    catalogRows: [catalogRow()],
    expectedSources,
    database: 'release_db',
    queryBytes: Buffer.from(query),
  })
}

describe('complete admitted long-read TR component inventory', () => {
  test('preserves ordered duplicate components and repeated source membership', async () => {
    const rows = completeRows()
    const repeated = { ...rows[0], source_record_id: `${rows[0].source_record_id}-repeat` }
    const artifact = await runBuild([...rows, repeated])
    expect(artifact.complete).toBe(true)
    expect(artifact.source_count).toBe(48)
    expect(artifact.source_record_count).toBe(49)
    expect(artifact.ordered_component_count).toBeGreaterThan(artifact.source_record_count)
    expect(artifact.inventory_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(artifact.sources.every((source: any) => source.source_record_count > 0)).toBe(true)
    const row = artifact.catalog_reconciliation.find(
      (item: any) => item.row_key === catalogRowKey(catalogRow())
    )
    expect(row.cohorts.aou.status).toBe('EXACT_UNIQUE')
    expect(row.cohorts.aou.candidates[0]).toEqual(
      expect.objectContaining({
        canonical_id: '1-10-20-AAG',
        ordered_component_index: 0,
        source_record_count: 2,
        source_record_membership_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    )
    expect(parseTrid('1-1-2-A+1-1-2-A').components).toHaveLength(2)
  })

  test('classifies overlap, rotation/reverse-complement, and motif differences exclusively', () => {
    expect(motifRelation('AAG', 'AGA')).toBe('CYCLIC_ROTATION')
    expect(motifRelation('AAG', 'CTT')).toBe('REVERSE_COMPLEMENT_ROTATION')
    expect(motifRelation('AAG', 'CCC')).toBe('DIFFERENT')
  })

  test('rejects malformed TRIDs and stale manifest runs', async () => {
    const malformed = completeRows()
    malformed[0] = { ...malformed[0], trid: 'not-a-trid' }
    await expect(runBuild(malformed)).rejects.toThrow('Invalid canonical LR locus ID')

    const stale = completeRows()
    stale[0] = { ...stale[0], run_id: 'stale-run' }
    await expect(runBuild(stale)).rejects.toThrow('Stale/unexpected run')
  })

  test('fails closed when any chromosome source is incomplete', async () => {
    await expect(runBuild(completeRows().slice(1))).rejects.toThrow(
      'Incomplete component inventory'
    )
  })

  test('does not publish a truncated stream without its counted completion marker', async () => {
    const expectedSources = validateManifestBundle(manifests())
    const query = buildExtractionQuery('release_db', expectedSources)
    const truncated = sortedInput(completeRows()).split('\n').slice(0, -2).join('\n')
    await expect(
      buildIndex({
        inputStream: Readable.from(truncated),
        catalogRows: [catalogRow()],
        expectedSources,
        database: 'release_db',
        queryBytes: Buffer.from(query),
      })
    ).rejects.toThrow('truncated or its completion counts do not match')
  })

  test('query is deterministic, read-only, and binds every manifest source', () => {
    const sources = validateManifestBundle(manifests())
    const query = buildExtractionQuery('release_db', sources)
    expect(query).toContain('FROM `release_db`.lr_y1_summaries')
    expect(query).toContain("allele_type = 'trv'")
    expect(query).toContain('ORDER BY sort_group, cohort, trid, source_record_id')
    expect(query).not.toMatch(/\b(INSERT|ALTER|DROP|DELETE|UPDATE|CREATE)\b/)
    // The same exact source fence appears in the data branch and counted completion branch.
    expect(query.match(/run_id = /g)).toHaveLength(sources.size * 2)
    expect(buildExtractionQuery('release_db', sources)).toBe(query)
  })
})
