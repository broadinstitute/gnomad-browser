import {
  aggregatePerCopyMethylation,
  deterministicSampleBatches,
  diploidPerCopyLayout,
  filterGroupsToSourceSamples,
  inclusiveRegionSpanBp,
  joinedMethylationRequestScope,
  joinedMethylationUsabilityForRegion,
  perCopyLoadingProgress,
  perCopyMethylationForReadyRow,
  validateJoinedMethylationBatch,
  type JoinedPhasedMethylationIdentity,
  type JoinedPhasedMethylationRecord,
  type PerCopyMethylationSampleState,
} from './perCopyMethylation'

const sourceSampleIds = Array.from(
  { length: 231 },
  (_, index) => `source-${String(index).padStart(3, '0')}`
)

const identity: JoinedPhasedMethylationIdentity = {
  source_run_id: 'source-run',
  source_completion_receipt_sha256: 'source-receipt',
  source_manifest_sha256: 'source-manifest',
  browser_vcf_manifest_bundle_sha256: 'browser-bundle',
  browser_vcf_manifest_sha256: 'browser-manifest',
  browser_vcf_run_id: 'browser-run',
  orientation_receipt_id: 'orientation-id',
  orientation_receipt_sha256: 'orientation-sha',
  mapping_artifact_sha256: null,
  mapping_scope: 'CHROMOSOME_WIDE',
}

const record = (
  sample: string,
  methylation: number,
  vcfStrand: 1 | 2,
  pos1 = 100
): JoinedPhasedMethylationRecord => ({
  source_row_key: `${sample}-${vcfStrand}-${pos1}`,
  chr: 'chr22',
  pos1,
  pos2: pos1 + 1,
  sample,
  methylation,
  coverage: 10,
  source_haplotype: vcfStrand === 1 ? 'HAP1' : 'HAP2',
  vcf_strand: vcfStrand,
  mapping_scope: 'CHROMOSOME_WIDE',
  phase_set: null,
})

const sample = (sampleId: string, strandA: number | null, strandB: number | null) => ({
  sample_id: sampleId,
  strand_mapping: { strandA, strandB },
  phase_set_mapping: { phaseSetA: null, phaseSetB: null },
})

describe('per-copy methylation mapping and aggregation', () => {
  test('maps direct and swapped strand mappings to canonical A/B before averaging', () => {
    const result = aggregatePerCopyMethylation(
      [
        record('direct', 20, 1),
        record('direct', 80, 2),
        record('swapped', 40, 2),
        record('swapped', 60, 1),
      ],
      [sample('direct', 1, 2), sample('swapped', 2, 1)]
    )

    expect(result.A).toEqual([
      expect.objectContaining({ meanMethylation: 30, sampleCount: 2, vcfStrands: [1, 2] }),
    ])
    expect(result.B).toEqual([
      expect.objectContaining({ meanMethylation: 70, sampleCount: 2, vcfStrands: [1, 2] }),
    ])
  })

  test('paints both canonical copies for one-sided GT1 and GT2 carrier mappings', () => {
    const result = aggregatePerCopyMethylation(
      [
        record('gt1-carrier', 10, 1),
        record('gt1-carrier', 20, 2),
        record('gt2-carrier', 30, 1),
        record('gt2-carrier', 40, 2),
      ],
      [sample('gt1-carrier', 2, 1), sample('gt2-carrier', 1, 2)]
    )

    expect(result.A).toEqual([
      expect.objectContaining({ meanMethylation: 25, sampleCount: 2, vcfStrands: [1, 2] }),
    ])
    expect(result.B).toEqual([
      expect.objectContaining({ meanMethylation: 25, sampleCount: 2, vcfStrands: [1, 2] }),
    ])
  })

  test('omits a missing side, source-absent sample, and records without a canonical mapping', () => {
    const result = aggregatePerCopyMethylation(
      [record('one-side', 25, 1), record('source-absent', 90, 2), record('unmapped', 75, 2)],
      [sample('one-side', 1, null), sample('source-absent', 1, 2), sample('unmapped', null, null)]
    )

    expect(result.A).toEqual([expect.objectContaining({ meanMethylation: 25, sampleCount: 1 })])
    expect(result.B).toEqual([expect.objectContaining({ meanMethylation: 90, sampleCount: 1 })])
  })

  test('never accepts sample-total rows as per-copy observations', () => {
    const sampleTotal = {
      chr: 'chr22',
      pos1: 100,
      pos2: 101,
      sample: 'direct',
      methylation: 99,
      coverage: 10,
      data_layer: 'SAMPLE_TOTAL',
      source_haplotype: null,
      vcf_strand: null,
      phase_set: null,
    }
    const result = aggregatePerCopyMethylation(
      [sampleTotal as unknown as JoinedPhasedMethylationRecord],
      [sample('direct', 1, 2)]
    )
    expect(result).toEqual({ A: [], B: [] })
  })
})

describe('joined methylation request and layout contracts', () => {
  test('batches deterministic unique sample IDs at no more than 25', () => {
    const ids = Array.from(
      { length: 27 },
      (_, index) => `sample-${String(26 - index).padStart(2, '0')}`
    )
    ids.push('sample-00')
    const batches = deterministicSampleBatches(ids)
    expect(batches.map((batch) => batch.length)).toEqual([25, 2])
    expect(batches.flat()).toEqual([...new Set(ids)].sort())
  })

  test('binds request scope and response accounting to the joined receipt hash', () => {
    const scope = joinedMethylationRequestScope({
      cohort: 'hgsvc_hprc',
      chrom: 'chr22',
      start: 100,
      stop: 200,
      enabled: true,
      identity,
    })
    expect(scope).toContain('orientation-sha')

    const validRegion = {
      identity,
      requested_sample_ids: ['sample-a', 'sample-b'],
      completed_sample_ids: ['sample-a'],
      unavailable_samples: [
        {
          sample_id: 'sample-b' as const,
          status: 'UNAVAILABLE_NO_ASSAY_SOURCE' as const,
          reason: 'no source',
        },
      ],
      records: [record('sample-a', 50, 1, 110)],
    }
    const expectation = {
      requestedSampleIds: ['sample-b', 'sample-a'],
      identity,
      chrom: '22',
      start: 100,
      stop: 200,
    }

    expect(() => validateJoinedMethylationBatch(validRegion, expectation)).not.toThrow()

    expect(() =>
      validateJoinedMethylationBatch(
        { ...validRegion, identity: { ...identity, browser_vcf_run_id: 'other-generation' } },
        expectation
      )
    ).toThrow('JOINED_IDENTITY_MISMATCH')
    expect(() =>
      validateJoinedMethylationBatch(
        { ...validRegion, records: [{ ...validRegion.records[0], chr: 'chr21' }] },
        expectation
      )
    ).toThrow('JOINED_RECORD_CONTRACT_MISMATCH')
    expect(() =>
      validateJoinedMethylationBatch(
        { ...validRegion, records: [record('sample-a', 50, 1, 201)] },
        expectation
      )
    ).toThrow('JOINED_RECORD_CONTRACT_MISMATCH')
    expect(() =>
      validateJoinedMethylationBatch(
        { ...validRegion, records: [validRegion.records[0], validRegion.records[0]] },
        expectation
      )
    ).toThrow('JOINED_RECORD_CONTRACT_MISMATCH')
    expect(() =>
      validateJoinedMethylationBatch(
        {
          ...validRegion,
          records: [
            validRegion.records[0],
            { ...validRegion.records[0], source_row_key: 'different-source-row-key' },
          ],
        },
        expectation
      )
    ).toThrow('JOINED_RECORD_CONTRACT_MISMATCH')
  })

  test('accepts canonical one-based CpGs at both inclusive request boundaries', () => {
    const boundaryRegion = {
      identity,
      requested_sample_ids: ['sample-a'],
      completed_sample_ids: ['sample-a'],
      unavailable_samples: [],
      records: [record('sample-a', 10, 1, 1), record('sample-a', 20, 1, 200)],
    }
    const expectation = {
      requestedSampleIds: ['sample-a'],
      identity,
      chrom: 'chr22',
      start: 1,
      stop: 200,
    }

    expect(() => validateJoinedMethylationBatch(boundaryRegion, expectation)).not.toThrow()
    expect(boundaryRegion.records.map(({ pos1, pos2 }) => [pos1, pos2])).toEqual([
      [1, 2],
      [200, 201],
    ])
    expect(() =>
      validateJoinedMethylationBatch(boundaryRegion, { ...expectation, start: 0 })
    ).toThrow('JOINED_REQUEST_REGION_MISMATCH')
  })

  test('uses inclusive one-based span boundaries', () => {
    expect(inclusiveRegionSpanBp(1, 100_000)).toBe(100_000)
    expect(inclusiveRegionSpanBp(1, 100_001)).toBe(100_001)
  })

  test('fails region usability closed for over-span and malformed capabilities', () => {
    const capability = {
      available: true as const,
      joinable_to_vcf: true as const,
      status: 'AVAILABLE_CONFIRMED' as const,
      identity,
      source_sample_ids: sourceSampleIds,
      max_span_bp: 100,
      max_samples: 25,
      max_records: 250000,
      reason: 'confirmed',
    }
    expect(joinedMethylationUsabilityForRegion(capability, 100, true).usable).toBe(true)
    expect(joinedMethylationUsabilityForRegion(capability, 101, true)).toEqual({
      usable: false,
      reason: 'Unavailable: region spans 101 bp; maximum is 100 bp',
    })
    expect(
      joinedMethylationUsabilityForRegion({ ...capability, max_samples: 0 }, 100, true)
    ).toEqual({ usable: false, reason: 'Unavailable: capability limits are malformed' })
    expect(
      joinedMethylationUsabilityForRegion({ ...capability, identity: null }, 100, true)
    ).toEqual({ usable: false, reason: 'Unavailable: capability identity is not admitted' })
  })

  test('filters group samples from the admitted roster without changing signatures and restores from the source groups', () => {
    const signatureA = { variants: [record('source-000', 20, 1) as any], readable_id: 'A' }
    const signatureB = { variants: [], readable_id: 'B' }
    const groups = [
      {
        is_diplotype: true as const,
        samples: [sample('source-000', 1, 2), sample('absent', 1, 2)],
        haplotypeA: signatureA,
        haplotypeB: signatureB,
      },
      {
        is_diplotype: true as const,
        samples: [sample('absent-only', 1, 2)],
        haplotypeA: signatureB,
        haplotypeB: signatureA,
      },
    ]

    const filtered = filterGroupsToSourceSamples(groups, sourceSampleIds)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].samples.map((row) => row.sample_id)).toEqual(['source-000'])
    expect(filtered[0].haplotypeA).toBe(signatureA)
    expect(filtered[0].haplotypeB).toBe(signatureB)
    expect(groups[0].samples.map((row) => row.sample_id)).toEqual(['source-000', 'absent'])
  })

  test('reports exact terminal progress across batches, empty/unavailable, and typed errors', () => {
    const ids = Array.from({ length: 27 }, (_, index) => `sample-${index}`)
    const states = new Map<string, PerCopyMethylationSampleState>()
    ids
      .slice(0, 25)
      .forEach((sampleId) => states.set(sampleId, { status: 'complete', recordCount: 0 }))
    expect(perCopyLoadingProgress(ids, states)).toEqual({
      status: 'loading',
      terminalCount: 25,
      totalCount: 27,
      errorCodes: [],
    })
    states.set(ids[25], { status: 'unavailable', reason: 'no source' })
    states.set(ids[26], { status: 'complete', recordCount: 0 })
    expect(perCopyLoadingProgress(ids, states).status).toBe('loaded')
    expect(perCopyLoadingProgress([], states).status).toBe('empty')
    states.set(ids[26], { status: 'error', code: 'JOINED_TYPED_ERROR', reason: 'failed' })
    expect(perCopyLoadingProgress(ids, states)).toEqual({
      status: 'error',
      terminalCount: 26,
      totalCount: 27,
      errorCodes: ['JOINED_TYPED_ERROR'],
    })
  })

  test('never aggregates a partial or failed 27-sample diplotype row', () => {
    const samples = Array.from({ length: 27 }, (_, index) =>
      sample(`sample-${String(index).padStart(2, '0')}`, 1, 2)
    )
    const records = samples.map((row, index) => record(row.sample_id, index, 1, 110))
    const firstBatchTerminal = new Map<string, PerCopyMethylationSampleState>(
      samples
        .slice(0, 25)
        .map((row) => [row.sample_id, { status: 'complete' as const, recordCount: 1 }])
    )

    expect(perCopyMethylationForReadyRow(records, samples, firstBatchTerminal)).toEqual({
      readiness: 'loading',
      points: { A: [], B: [] },
    })

    const secondBatchFailed = new Map(firstBatchTerminal)
    samples.slice(25).forEach((row) =>
      secondBatchFailed.set(row.sample_id, {
        status: 'error',
        code: 'FAILED_BATCH',
        reason: 'failed',
      })
    )
    expect(perCopyMethylationForReadyRow(records, samples, secondBatchFailed)).toEqual({
      readiness: 'error',
      points: { A: [], B: [] },
    })

    const allTerminal = new Map(firstBatchTerminal)
    allTerminal.set(samples[25].sample_id, { status: 'complete', recordCount: 1 })
    allTerminal.set(samples[26].sample_id, { status: 'unavailable', reason: 'no source' })
    const ready = perCopyMethylationForReadyRow(records.slice(0, 26), samples, allTerminal)
    expect(ready.readiness).toBe('ready')
    expect(ready.points.A).toEqual([
      expect.objectContaining({ sampleCount: 26, meanMethylation: 12.5 }),
    ])
  })

  test('reserves stable A/methylation-A/B/methylation-B ordering and clears ROH geometry', () => {
    const layout = diploidPerCopyLayout(10, true)
    expect(layout.variantABaseline).toBeLessThan(layout.methylationABandTop!)
    expect(layout.methylationABandTop!).toBeLessThan(layout.variantBBaseline)
    expect(layout.variantBBaseline).toBeLessThan(layout.methylationBBandTop!)
    expect(layout.relationshipMarkY).toBeGreaterThan(layout.methylationABandTop! + 28)
    expect(layout.relationshipMarkY).toBeLessThan(layout.variantBBaseline)
    expect(layout.rowHeight).toBe(diploidPerCopyLayout(10, true).rowHeight)
    expect(layout.rowHeight).toBeGreaterThan(diploidPerCopyLayout(10, false).rowHeight)
  })
})
