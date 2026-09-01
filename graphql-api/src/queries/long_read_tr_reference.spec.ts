jest.mock('./short-tandem-repeat-queries', () => ({
  fetchBoundedShortTandemRepeatCatalog: jest.fn(),
  fetchShortTandemRepeatById: jest.fn(),
}))

// Elasticsearch is mocked before the crosswalk module initializes its imports.
// eslint-disable-next-line import/first
import {
  buildLongReadTrReferenceConnection,
  compactCatalogSha256,
  longReadTrReferenceArtifactForTests,
  resolveLongReadTrShortReadContext,
} from './long_read_tr_reference'
// eslint-disable-next-line import/first
import {
  fetchBoundedShortTandemRepeatCatalog,
  fetchShortTandemRepeatById,
} from './short-tandem-repeat-queries'
// eslint-disable-next-line import/first
import { parseTrLocusId } from '../../../dataset-metadata/longReadTrLocusId'

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

  test('reconciles every receipt-bound row and status category without N+1', async () => {
    const esClient = {}
    const getSource = jest.fn(sourceFor)
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, getSource)
    expect(result.total_count).toBe(longReadTrReferenceArtifactForTests.catalog_contract.row_count)
    for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
      const expected = longReadTrReferenceArtifactForTests.catalog_contract.expected_status_counts[
        cohort
      ]
      expect(
        Object.fromEntries(
          Object.keys(expected).map((status) => [
            status,
            result.nodes.filter((node: any) => node[cohort].status === status).length,
          ])
        )
      ).toEqual(expected)
    }
    expect(result.nodes[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        reference_region: expect.objectContaining({ reference_genome: 'GRCh38' }),
      })
    )
    expect(
      (result.nodes.find((node: any) => node.id === 'ATXN1') as any).aou.canonical_ids
    ).toEqual(['6-16327633-16327723-TGC'])
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
    expect(htt.nodes[0].hgsvc_hprc.candidates[0].canonical_id).toContain('+4-3074927-3074936-CAA')

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

  test('fails one stale source closed without hiding the other cohort or receipt-bound rows', async () => {
    const esClient = {}
    const staleAoU = async (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
      const source = await sourceFor(cohort, chrom)
      return cohort === 'aou' && source ? { ...source, run_id: 'stale-run' } : source
    }
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, staleAoU)
    expect(result.total_count).toBe(longReadTrReferenceArtifactForTests.catalog_contract.row_count)
    const atxn1 = result.nodes.find((node: any) => node.id === 'ATXN1') as any
    expect(atxn1.hgsvc_hprc.status).toBe('EXACT_UNIQUE')
    expect(atxn1.aou).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'SOURCE_PROVENANCE_MISMATCH' })
    )
  })

  test('contains a source lookup exception to its cohort/chromosome cell', async () => {
    const esClient = {}
    const throwingAoU = async (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
      if (cohort === 'aou' && chrom.toUpperCase() === 'CHR6') throw new Error('lookup failed')
      return sourceFor(cohort, chrom)
    }
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, throwingAoU)
    expect(result.total_count).toBe(longReadTrReferenceArtifactForTests.catalog_contract.row_count)
    expect(
      result.nodes.filter((node: any) => node.hgsvc_hprc.status === 'EXACT_UNIQUE')
    ).toHaveLength(
      longReadTrReferenceArtifactForTests.catalog_contract.expected_status_counts.hgsvc_hprc
        .EXACT_UNIQUE
    )
    const atxn1 = result.nodes.find((node: any) => node.id === 'ATXN1') as any
    expect(atxn1.hgsvc_hprc.status).toBe('EXACT_UNIQUE')
    expect(atxn1.aou).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'SOURCE_UNAVAILABLE' })
    )
  })

  test('catalog digest is independent of Elasticsearch object key order', () => {
    const reorderedRows = catalogRows.map((row: any) => ({
      repeat_units: row.repeat_units.map((unit: any) => ({
        classification: unit.classification,
        repeat_unit: unit.repeat_unit,
      })),
      reference_repeat_unit: row.reference_repeat_unit,
      reference_regions: row.reference_regions.map((region: any) => ({
        stop: region.stop,
        chrom: region.chrom,
        start: region.start,
        reference_genome: region.reference_genome,
      })),
      main_reference_region: {
        stop: row.main_reference_region.stop,
        reference_genome: row.main_reference_region.reference_genome,
        start: row.main_reference_region.start,
        chrom: row.main_reference_region.chrom,
      },
      strchive_id: row.strchive_id,
      stripy_id: row.stripy_id,
      associated_diseases: row.associated_diseases.map((disease: any) => ({
        notes: disease.notes,
        repeat_size_classifications: disease.repeat_size_classifications.map(
          (classification: any) => ({
            max: classification.max,
            classification: classification.classification,
            min: classification.min,
          })
        ),
        inheritance_mode: disease.inheritance_mode,
        omim_id: disease.omim_id,
        symbol: disease.symbol,
        name: disease.name,
      })),
      gene: row.gene,
      id: row.id,
    }))
    expect(compactCatalogSha256(reorderedRows)).toBe(
      longReadTrReferenceArtifactForTests.catalog.compact_sha256
    )
    const compIndex = reorderedRows.findIndex((row: any) => row.id === 'COMP')
    const driftedNotes = structuredClone(reorderedRows)
    driftedNotes[compIndex].associated_diseases[1].notes = 'drifted clinical note'
    expect(compactCatalogSha256(driftedNotes)).not.toBe(
      longReadTrReferenceArtifactForTests.catalog.compact_sha256
    )
    const driftedUnits = structuredClone(reorderedRows)
    driftedUnits[0].repeat_units[0].classification = 'benign'
    expect(compactCatalogSha256(driftedUnits)).not.toBe(
      longReadTrReferenceArtifactForTests.catalog.compact_sha256
    )
  })

  test('fails all cohort cells closed when the catalog digest drifts', async () => {
    const esClient = {}
    fetchAll.mockResolvedValue(
      catalogRows.map((row: any, index: number) =>
        index === 0 ? { ...row, reference_repeat_unit: 'DRIFT' } : row
      )
    )
    const result = await buildLongReadTrReferenceConnection({ first: 100 }, esClient, sourceFor)
    expect(result.provenance.catalog_available).toBe(false)
    expect(result.nodes.every((node: any) => node.aou.status === 'UNAVAILABLE')).toBe(true)
    expect(result.nodes[0].aou.reason_code).toBe('CATALOG_DIGEST_MISMATCH')
  })

  test.each([
    ['ATXN1', 'pathogenic'],
    ['HTT', 'pathogenic'],
    ['EIF4A3', 'benign'],
    ['RFC1', 'benign'],
    ['STARD7', 'benign'],
  ])(
    'authorizes exact reference identity independently of the %s catalog classification',
    async (id, expectedClassification) => {
      const artifactRow = longReadTrReferenceArtifactForTests.rows.find(
        (row: any) => row.short.id === id
      ) as any
      const result = artifactRow.cohorts.hgsvc_hprc
      const candidate = result.candidates[0]
      const parsed = parseTrLocusId(candidate.canonical_id)!
      fetchById.mockResolvedValue(artifactRow.short)
      const locus = {
        id: candidate.canonical_id,
        chrom: candidate.matched_component.chrom,
        components: parsed.components,
        lr_cohort: 'hgsvc_hprc',
      }
      const context = await resolveLongReadTrShortReadContext(locus, {}, sourceFor)
      expect(context.status).toBe('EXACT_UNIQUE')
      expect(context.catalog_record.id).toBe(id)
      expect(context.matched_component_index).toBe(0)
      expect(context.exact_reference_component_outline_authorized).toBe(true)
      expect(context.matched_reference_repeat_unit_classifications).toContain(
        expectedClassification
      )
      expect(context.candidates).toHaveLength(1)
      const expectedComponentCounts: Record<string, number> = { HTT: 6, EIF4A3: 2 }
      expect(parsed.components).toHaveLength(expectedComponentCounts[id] || 1)
      if (id === 'EIF4A3') {
        expect(context.matched_component.motif).toBe('CCTCGCTGTGCCGCTGCCGA')
        expect(context.matched_reference_repeat_unit_classifications).toEqual(['benign'])
        expect(
          context.catalog_record.repeat_units.find(
            (unit: any) => unit.classification === 'pathogenic'
          ).repeat_unit
        ).toBe('CCTCGCTGCGCCGCTGCCGA')
      }
      expect(fetchById).toHaveBeenCalledTimes(1)
    }
  )

  test.each(['hgsvc_hprc', 'aou'] as const)(
    'authorizes one neutral exact-reference outline for every receipt-bound %s match',
    async (cohort) => {
      const expectedCount =
        longReadTrReferenceArtifactForTests.catalog_contract.expected_status_counts[cohort]
          .EXACT_UNIQUE
      const exactRows = longReadTrReferenceArtifactForTests.rows.filter(
        (row: any) => row.cohorts[cohort].status === 'EXACT_UNIQUE'
      ) as any[]
      fetchById.mockImplementation(async (_client, _dataset, id) =>
        catalogRows.find((row: any) => row.id === id)
      )
      const contexts = await Promise.all(
        exactRows.map((row) => {
          const candidate = row.cohorts[cohort].candidates[0]
          const parsed = parseTrLocusId(candidate.canonical_id)!
          return resolveLongReadTrShortReadContext(
            {
              id: candidate.canonical_id,
              chrom: candidate.matched_component.chrom,
              components: parsed.components,
              lr_cohort: cohort,
            },
            {},
            sourceFor
          )
        })
      )
      expect(contexts).toHaveLength(expectedCount)
      expect(
        contexts.flatMap((context, index) =>
          context.status === 'EXACT_UNIQUE' &&
          context.exact_reference_component_outline_authorized &&
          context.candidates[0].matched_reference_region_index ===
            context.matched_reference_region_index
            ? []
            : [
                {
                  id: exactRows[index].short.id,
                  status: context.status,
                  reason_code: context.reason_code,
                  authorized: context.exact_reference_component_outline_authorized,
                },
              ]
        )
      ).toEqual([])
    }
  )

  test('rejects detail when a decision-bearing raw repeat classification drifts', async () => {
    const artifactRow = longReadTrReferenceArtifactForTests.rows.find(
      (row: any) => row.short.id === 'ATXN1'
    ) as any
    const candidate = artifactRow.cohorts.hgsvc_hprc.candidates[0]
    const parsed = parseTrLocusId(candidate.canonical_id)!
    fetchById.mockResolvedValue({
      ...artifactRow.short,
      repeat_units: artifactRow.short.repeat_units.map((unit: any, index: number) =>
        index === 0 ? { ...unit, classification: 'drifted' } : unit
      ),
    })
    const context = await resolveLongReadTrShortReadContext(
      {
        id: candidate.canonical_id,
        chrom: candidate.matched_component.chrom,
        components: parsed.components,
        lr_cohort: 'hgsvc_hprc',
      },
      {},
      sourceFor
    )
    expect(context).toEqual(
      expect.objectContaining({
        status: 'CATALOG_UNAVAILABLE',
        reason_code: 'CATALOG_DETAIL_DIGEST_MISMATCH',
        exact_reference_component_outline_authorized: false,
        matched_reference_repeat_unit_classifications: [],
        pathogenic_component_highlight: false,
      })
    )
  })

  test('fails the exact-reference outline closed when the authorized component tuple differs', async () => {
    const artifactRow = longReadTrReferenceArtifactForTests.rows.find(
      (row: any) => row.short.id === 'ATXN1'
    ) as any
    const candidate = artifactRow.cohorts.hgsvc_hprc.candidates[0]
    const parsed = parseTrLocusId(candidate.canonical_id)!
    const locus = {
      id: candidate.canonical_id,
      chrom: candidate.matched_component.chrom,
      components: [{ ...parsed.components[0], motif: 'WRONG' }],
      lr_cohort: 'hgsvc_hprc',
    }
    const context = await resolveLongReadTrShortReadContext(locus, {}, sourceFor)
    expect(context).toEqual(
      expect.objectContaining({
        status: 'AMBIGUOUS',
        reason_code: 'LR_LOCUS_COMPONENT_MISMATCH',
        exact_reference_component_outline_authorized: false,
        matched_reference_repeat_unit_classifications: [],
        pathogenic_component_highlight: false,
      })
    )
    expect(context.catalog_record).toBeUndefined()
    expect(fetchById).not.toHaveBeenCalled()
  })

  test.each([
    ['null', async () => null, 'SOURCE_UNAVAILABLE'],
    ['throwing', async () => Promise.reject(new Error('source failed')), 'SOURCE_UNAVAILABLE'],
    [
      'stale',
      async () => ({ ...(await sourceFor('hgsvc_hprc', 'chr6'))!, run_id: 'stale-run' }),
      'SOURCE_PROVENANCE_MISMATCH',
    ],
  ])('validates a %s source before returning NONE detail', async (_label, getSource, reason) => {
    const locus = {
      id: '6-1-2-A',
      chrom: '6',
      components: [{ chrom: '6', start0: 1, end0: 2, motif: 'A' }],
      lr_cohort: 'hgsvc_hprc',
    }
    const context = await resolveLongReadTrShortReadContext(locus, {}, getSource as any)
    expect(context).toEqual(expect.objectContaining({ status: 'UNAVAILABLE', reason_code: reason }))
  })

  test.each([['AMBIGUOUS', 'MULTIPLE_EXACT_ORDERED_COMPONENT_IDENTITIES']])(
    'preserves %s detail status and all candidates without clinical context',
    async (status, reason) => {
      const artifactRow = longReadTrReferenceArtifactForTests.rows.find(
        (row: any) => row.short.id === 'ATXN1'
      ) as any
      const result = artifactRow.cohorts.hgsvc_hprc
      const originalStatus = result.status
      const originalReason = result.reason_code
      const originalCandidates = result.candidates
      const candidate = originalCandidates[0]
      result.status = status
      result.reason_code = reason
      result.candidates = [candidate, { ...candidate }]
      try {
        const parsed = parseTrLocusId(candidate.canonical_id)!
        const context = await resolveLongReadTrShortReadContext(
          {
            id: candidate.canonical_id,
            chrom: candidate.matched_component.chrom,
            components: parsed.components,
            lr_cohort: 'hgsvc_hprc',
          },
          {},
          sourceFor
        )
        expect(context).toEqual(
          expect.objectContaining({
            status,
            reason_code: reason,
            candidates: result.candidates,
            exact_reference_component_outline_authorized: false,
            matched_reference_repeat_unit_classifications: [],
            pathogenic_component_highlight: false,
          })
        )
        expect(context.catalog_record).toBeUndefined()
        expect(fetchById).not.toHaveBeenCalled()
      } finally {
        result.status = originalStatus
        result.reason_code = originalReason
        result.candidates = originalCandidates
      }
    }
  )
})
