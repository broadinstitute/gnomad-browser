import {
  aggregatePerCopyMethylation,
  deterministicSampleBatches,
  diploidPerCopyLayout,
  filterGroupsToSourceSamples,
  inclusiveRegionSpanBp,
  joinedMethylationCoordinateChunks,
  loadJoinedMethylationChunks,
  JOINED_MAX_VIEWPORT_REQUESTS,
  JOINED_MAX_VIEWPORT_RECORDS,
  JOINED_ZOOM_NEEDED,
  joinedMethylationRequestScope,
  joinedMethylationUsabilityForRegion,
  perCopyLoadingProgress,
  withSourceAbsentSampleStates,
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

describe('bounded coordinate batches', () => {
  const expectation = { identity, requestedSampleIds: ['s', 'absent'], chrom: '22', start: 100, stop: 50100 }
  const limits = { max_span_bp: 10000, max_records: 250000 }
  const response = (chunk: { start: number; stop: number }) => ({
    identity, requested_sample_ids: ['s', 'absent'], completed_sample_ids: ['s'],
    unavailable_samples: [{ sample_id: 'absent', status: 'UNAVAILABLE_NO_ASSAY_SOURCE' as const, reason: 'No source' }],
    records: [record('s', 20, 1, chunk.start)],
  })

  test.each([10000, 10001, 50001])('partitions %i inclusive bases without overlap or conversion', (span) => {
    const chunks = joinedMethylationCoordinateChunks(31400000, 31400000 + span - 1, 10000)
    expect(chunks).toHaveLength(Math.ceil(span / 10000))
    expect(chunks[0].start).toBe(31400000)
    expect(chunks[chunks.length - 1].stop).toBe(31400000 + span - 1)
    expect(chunks.reduce((n, c) => n + c.stop - c.start + 1, 0)).toBe(span)
    chunks.forEach((c, i) => {
      expect(c.stop - c.start + 1).toBeLessThanOrEqual(10000)
      if (i) expect(c.start).toBe(chunks[i - 1].stop + 1)
    })
  })

  test('bounds local fanout without imposing a new span restriction on ordinary routes', () => {
    expect(() => joinedMethylationCoordinateChunks(1, 60001, 10000)).toThrow(JOINED_ZOOM_NEEDED)
    expect(joinedMethylationCoordinateChunks(1, 1000001)).toEqual([{ start: 1, stop: 1000001 }])
    expect(joinedMethylationCoordinateChunks(1, 120, 20)).toHaveLength(6) // capability, not hardcoded 10kb
    expect(() => joinedMethylationCoordinateChunks(1, 121, 20)).toThrow(JOINED_ZOOM_NEEDED)
  })

  test('serializes all six chunks and commits exact first/last CpGs only after full completion', async () => {
    const calls: any[] = []
    const budget = { requests: 0, records: 0 }
    let active = 0; let maxActive = 0
    const result = await loadJoinedMethylationChunks(expectation, limits, budget, new AbortController().signal, async c => {
      active += 1; maxActive = Math.max(maxActive, active); calls.push(c)
      await Promise.resolve(); active -= 1
      return { ...response(c), records: [record('s', 20, 1, c.start), record('s', 80, 2, c.stop)] }
    })
    expect(maxActive).toBe(1)
    expect(calls).toHaveLength(6)
    expect(result.records[0].pos1).toBe(100)
    expect(result.records[11]).toMatchObject({ pos1: 50100, pos2: 50101 })
    expect(result.completed_sample_ids).toEqual(['s'])
    expect(result.unavailable_samples[0].sample_id).toBe('absent')
    expect(budget).toEqual({ requests: 6, records: 12 })
  })

  test.each(['receipt', 'sample', 'chromosome', 'source-status', 'duplicate'])('rejects a wrong %s in any later chunk', async kind => {
    let index = 0
    await expect(loadJoinedMethylationChunks(expectation, limits, { requests: 0, records: 0 }, new AbortController().signal, async c => {
      const r = response(c)
      if (index++ === 1) {
        if (kind === 'receipt') r.identity = { ...identity, orientation_receipt_sha256: 'wrong' }
        if (kind === 'sample') r.requested_sample_ids = ['intruder', 'absent']
        if (kind === 'chromosome') r.records[0].chr = 'chr6'
        if (kind === 'source-status') { r.completed_sample_ids = ['s', 'absent']; r.unavailable_samples = [] }
        if (kind === 'duplicate') r.records[0].source_row_key = 's-1-100'
      }
      return r
    })).rejects.toThrow(/JOINED_/)
  })

  test('failed chunk never completes a sample; explicit retry restarts the whole batch', async () => {
    const budget = { requests: 0, records: 0 }; let calls = 0
    await expect(loadJoinedMethylationChunks(expectation, limits, budget, new AbortController().signal, async c => {
      if (++calls === 2) throw new Error('failed chunk')
      return response(c)
    })).rejects.toThrow('failed chunk')
    expect(budget.requests).toBe(2)
    const result = await loadJoinedMethylationChunks(expectation, limits, budget, new AbortController().signal, async c => response(c))
    expect(result.records).toHaveLength(6)
    expect(budget.requests).toBe(8)
  })

  test('an abort suppresses late results and does not launch another chunk', async () => {
    const controller = new AbortController(); const request = jest.fn(async c => { controller.abort(); return response(c) })
    await expect(loadJoinedMethylationChunks(expectation, limits, { requests: 0, records: 0 }, controller.signal, request)).rejects.toMatchObject({ name: 'AbortError' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  test('caps total requests including retries and total points across sample batches', async () => {
    const request = jest.fn(async c => response(c))
    await expect(loadJoinedMethylationChunks(expectation, limits, { requests: JOINED_MAX_VIEWPORT_REQUESTS - 5, records: 0 }, new AbortController().signal, request)).rejects.toThrow('request limit')
    expect(request).not.toHaveBeenCalled()
    await expect(loadJoinedMethylationChunks(expectation, limits, { requests: 0, records: JOINED_MAX_VIEWPORT_RECORDS }, new AbortController().signal, request)).rejects.toThrow('point limit')
    expect(request).toHaveBeenCalledTimes(1)
    await expect(loadJoinedMethylationChunks(expectation, { ...limits, max_records: 0 }, { requests: 0, records: 0 }, new AbortController().signal, request)).rejects.toThrow('point limit')
  })
})

describe('per-copy methylation mapping and aggregation', () => {
  test('admits the explicitly labelled operator assumption, not a fabricated verification claim', () => {
    const capability = {
      available: true, joinable_to_vcf: true, status: 'AVAILABLE_OPERATOR_ASSUMPTION' as const,
      source_sample_ids: sourceSampleIds, max_samples: 25, max_records: 250000, reason: 'Assumed; confirmation pending',
      identity: { ...identity, approval_basis: 'operator_direct_mapping_assumption' as const, independently_machine_verified_lineage: false as const },
    }
    expect(joinedMethylationUsabilityForRegion(capability, 1001, true).usable).toBe(true)
    expect(joinedMethylationUsabilityForRegion({ ...capability, max_span_bp: 10000 }, 10000, true).usable).toBe(true)
    expect(joinedMethylationUsabilityForRegion({ ...capability, max_span_bp: 10000 }, 50001, true).usable).toBe(true)
    expect(joinedMethylationUsabilityForRegion({ ...capability, max_span_bp: 10000 }, 60001, true)).toEqual({ usable: false, reason: JOINED_ZOOM_NEEDED })
    expect(joinedMethylationUsabilityForRegion({ ...capability, identity }, 1001, true).usable).toBe(false)
    expect(joinedMethylationUsabilityForRegion({ ...capability, identity: { ...capability.identity, independently_machine_verified_lineage: true } } as any, 1001, true).usable).toBe(false)
  })

  test('a source-absent row member is unavailable, never perpetual loading or a zero-valued observation', () => {
    const states = new Map<string, PerCopyMethylationSampleState>([['present', { status: 'complete', recordCount: 2 }]])
    const augmented = withSourceAbsentSampleStates(states, ['present', 'absent', 'still-loading'], ['present', 'still-loading'])
    expect(augmented.get('absent')?.status).toBe('unavailable')
    expect(augmented.has('still-loading')).toBe(false)
    expect(states.has('absent')).toBe(false)
    const records = [record('present', 20, 1), record('present', 80, 2)]
    const result = perCopyMethylationForReadyRow(records, [sample('present', 2, 1), sample('absent', 1, 2)], augmented)
    expect(result.readiness).toBe('ready')
    expect(result.points.A[0]).toMatchObject({ meanMethylation: 80, sampleCount: 1 })
    expect(result.points.B[0]).toMatchObject({ meanMethylation: 20, sampleCount: 1 })
    expect(perCopyMethylationForReadyRow(records, [sample('present', 2, 1), sample('still-loading', 1, 2)], augmented).readiness).toBe('loading')
  })

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

  test('admits regions over 100 kb while failing malformed resource capabilities closed', () => {
    const capability = {
      available: true as const,
      joinable_to_vcf: true as const,
      status: 'AVAILABLE_CONFIRMED' as const,
      identity,
      source_sample_ids: sourceSampleIds,
      max_samples: 25,
      max_records: 250000,
      reason: 'confirmed',
    }
    // The presentation gate is true for either Diploid or Similarity Clusters mode.
    expect(joinedMethylationUsabilityForRegion(capability, 100_001, true).usable).toBe(true)
    expect(joinedMethylationUsabilityForRegion(capability, 100_001, false)).toEqual({
      usable: false,
      reason: 'Unavailable outside Diploid or Similarity Clusters view',
    })
    expect(
      joinedMethylationUsabilityForRegion({ ...capability, max_samples: 0 }, 100_001, true)
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
