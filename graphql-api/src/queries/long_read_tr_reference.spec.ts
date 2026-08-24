jest.mock('./short-tandem-repeat-queries', () => ({
  fetchBoundedShortTandemRepeatCatalog: jest.fn(),
  fetchShortTandemRepeatById: jest.fn(),
}))

// Elasticsearch is mocked before the crosswalk module initializes its imports.
// eslint-disable-next-line import/first
import {
  buildLongReadTrReferenceConnection,
  longReadTrReferenceArtifactForTests,
  resolveLongReadTrShortReadContext,
} from './long_read_tr_reference'
// eslint-disable-next-line import/first
import {
  fetchBoundedShortTandemRepeatCatalog,
  fetchShortTandemRepeatById,
} from './short-tandem-repeat-queries'

const fetchAll = fetchBoundedShortTandemRepeatCatalog as jest.Mock
const fetchById = fetchShortTandemRepeatById as jest.Mock
const catalogRows = longReadTrReferenceArtifactForTests.rows.map((row: any) => row.short)

const sourceFor = async (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
  const row = longReadTrReferenceArtifactForTests.rows.find(
    (item: any) =>
      `chr${item.short.main_reference_region.chrom}`.toUpperCase() === chrom.toUpperCase()
  ) as any
  if (!row) return null
  const result = row.cohorts[cohort]
  return {
    database: result.source_database,
    release: result.source_release,
    cohort,
    reference_genome: 'GRCh38',
    chrom,
    load_scope: 'full_chromosome',
    run_id: result.source_run_id,
    state: 'accepted_tasks' as const,
    metadata_run_id: null,
    carriers_available: cohort === 'hgsvc_hprc',
  }
}

describe('bounded long-read TR reference crosswalk', () => {
  beforeEach(() => {
    fetchAll.mockReset().mockResolvedValue(catalogRows)
    fetchById.mockReset()
  })

  test('reconciles all 78 rows to 51 HGSVC/HPRC and 58 AoU exact matches without N+1', async () => {
    const esClient = {}
    const getSource = jest.fn(sourceFor)
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, getSource)
    expect(result.total_count).toBe(78)
    expect(result.nodes.filter((node: any) => node.hgsvc_hprc.status === 'EXACT_UNIQUE')).toHaveLength(
      51
    )
    expect(result.nodes.filter((node: any) => node.aou.status === 'EXACT_UNIQUE')).toHaveLength(58)
    expect(result.nodes[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        reference_region: expect.objectContaining({ reference_genome: 'GRCh38' }),
      })
    )
    expect((result.nodes.find((node: any) => node.id === 'ATXN1') as any).aou.canonical_ids).toEqual([
      '6-16327633-16327723-TGC',
    ])
    expect(fetchAll).toHaveBeenCalledTimes(1)
    expect(fetchById).not.toHaveBeenCalled()
    // One source-snapshot lookup per cohort/chromosome, never per row or candidate.
    expect(getSource.mock.calls.length).toBeLessThanOrEqual(48)
  })

  test('supports exact ATXN1/HTT search, filtering, stable paging, and cursor validation', async () => {
    const esClient = {}
    const atxn1 = await buildLongReadTrReferenceConnection(
      { first: 50, query: 'ATXN1' },
      esClient,
      sourceFor
    )
    expect(atxn1.nodes.map((node: any) => node.short_record.id)).toEqual(['ATXN1', 'ATXN10'])

    const htt = await buildLongReadTrReferenceConnection(
      { first: 50, query: '4-3074876-3074933-CAG' },
      esClient,
      sourceFor
    )
    expect(htt.nodes).toHaveLength(1)
    expect(htt.nodes[0].short_record.id).toBe('HTT')
    expect(htt.nodes[0].hgsvc_hprc.candidates[0].canonical_id).toContain(
      '+4-3074927-3074936-CAA'
    )

    const firstPage = await buildLongReadTrReferenceConnection(
      { first: 1, match_status: 'BOTH' },
      esClient,
      sourceFor
    )
    expect(firstPage.page_info.has_next_page).toBe(true)
    const secondPage = await buildLongReadTrReferenceConnection(
      { first: 1, after: firstPage.page_info.end_cursor, match_status: 'BOTH' },
      esClient,
      sourceFor
    )
    expect(secondPage.nodes[0].short_record.id).not.toBe(firstPage.nodes[0].short_record.id)
    await expect(
      buildLongReadTrReferenceConnection(
        { first: 1, after: firstPage.page_info.end_cursor, match_status: 'NONE' },
        esClient,
        sourceFor
      )
    ).rejects.toThrow('Invalid long-read TR reference cursor')
    await expect(
      buildLongReadTrReferenceConnection({ first: 101 }, esClient, sourceFor)
    ).rejects.toThrow('first must be between 1 and 100')
  })

  test('fails one stale source closed without hiding the other cohort or the 78 rows', async () => {
    const esClient = {}
    const staleAoU = async (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
      const source = await sourceFor(cohort, chrom)
      return cohort === 'aou' && source ? { ...source, run_id: 'stale-run' } : source
    }
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, staleAoU)
    expect(result.total_count).toBe(78)
    const atxn1 = result.nodes.find((node: any) => node.id === 'ATXN1') as any
    expect(atxn1.hgsvc_hprc.status).toBe('EXACT_UNIQUE')
    expect(atxn1.aou).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'SOURCE_PROVENANCE_MISMATCH' })
    )
  })

  test('fails all cohort cells closed when the catalog digest drifts', async () => {
    const esClient = {}
    fetchAll.mockResolvedValue(catalogRows.map((row: any, index: number) =>
      index === 0 ? { ...row, reference_repeat_unit: 'DRIFT' } : row
    ))
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, sourceFor)
    expect(result.provenance.catalog_available).toBe(false)
    expect(result.nodes.every((node: any) => node.aou.status === 'UNAVAILABLE')).toBe(true)
    expect(result.nodes[0].aou.reason_code).toBe('CATALOG_DIGEST_MISMATCH')
  })

  test.each(['ATXN1', 'HTT'])('returns exact detail context and only the authorized component for %s', async (id) => {
    const artifactRow = longReadTrReferenceArtifactForTests.rows.find(
      (row: any) => row.short.id === id
    ) as any
    const result = artifactRow.cohorts.hgsvc_hprc
    const candidate = result.candidates[0]
    fetchById.mockResolvedValue({
      ...artifactRow.short,
      reference_regions: [artifactRow.short.main_reference_region],
      repeat_units: [
        { repeat_unit: artifactRow.short.reference_repeat_unit, classification: 'pathogenic' },
      ],
    })
    const locus = {
      id: candidate.canonical_id,
      chrom: candidate.matched_component.chrom,
      lr_cohort: 'hgsvc_hprc',
    }
    const context = await resolveLongReadTrShortReadContext(locus, {}, sourceFor)
    expect(context.status).toBe('EXACT_UNIQUE')
    expect(context.catalog_record.id).toBe(id)
    expect(context.matched_component_index).toBe(0)
    expect(context.pathogenic_component_highlight).toBe(true)
    expect(context.candidates).toHaveLength(1)
    expect(fetchById).toHaveBeenCalledTimes(1)
  })
})
