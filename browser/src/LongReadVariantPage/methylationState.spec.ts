import { describe, expect, test } from '@jest/globals'

import type { Methylation } from '../Haplotypes'
import {
  incompleteMethylationSampleIds,
  mergeMethylationRecords,
  methylationBatchFromGraphQL,
  methylationRecordIdentity,
  methylationRequestScope,
  methylationSampleIdentity,
  responseForCurrentMethylationRequest,
  MethylationRequestGate,
} from './methylationState'

const scope = methylationRequestScope({
  cohort: 'hgsvc_hprc',
  chrom: 'chr22',
  start: 100,
  stop: 200,
  dataLayer: 'SAMPLE_TOTAL',
  source: {
    source: 'LEGACY_V1',
    release: 'legacy',
    cohort: 'hgsvc_hprc',
    reference_genome: 'GRCh38',
    chromosome: 'chr22',
    run_id: null,
  },
  enabled: true,
})

const row = (sample: string, methylation: number): Methylation => ({
  chr: 'chr22',
  pos1: 150,
  pos2: 151,
  sample,
  methylation,
  coverage: 20,
  data_layer: 'SAMPLE_TOTAL',
  source_haplotype: null,
  vcf_strand: null,
  phase_set: null,
})

describe('sample-total methylation identity', () => {
  test('replaces an outlier-prefetched observation returned by load-all without weighting it twice', () => {
    const prefetched = mergeMethylationRecords(new Map(), [row('sample-a', 0)], scope)
    const loaded = mergeMethylationRecords(prefetched, [row('sample-a', 0), row('sample-b', 1)], scope)
    const observations = [...loaded.values()]
    const mean = observations.reduce((sum, observation) => sum + observation.methylation, 0) /
      observations.length

    expect(loaded.size).toBe(2)
    expect(mean).toBe(0.5)
    expect(loaded.get(methylationRecordIdentity(scope, row('sample-a', 0)))).toEqual(row('sample-a', 0))
  })

  test('does not request completed identities on repeated load-all', () => {
    const completed = new Set([
      methylationSampleIdentity(scope, 'sample-a'),
      methylationSampleIdentity(scope, 'sample-b'),
    ])

    expect(incompleteMethylationSampleIds(['sample-a', 'sample-b'], completed, scope)).toEqual([])
  })

  test('distinguishes all currently available row and source identities', () => {
    const base = row('sample-a', 0.5)
    expect(methylationRecordIdentity(scope, base)).not.toBe(methylationRecordIdentity(scope, {
      ...base,
      pos2: base.pos2 + 1,
    }))
    expect(methylationRecordIdentity(scope, base)).not.toBe(methylationRecordIdentity(scope, {
      ...base,
      data_layer: 'SOURCE_PHASED',
      source_haplotype: 'HAP1',
      vcf_strand: 1,
      phase_set: 'PS-A',
      ancillary_run_id: 'run-a',
      source_version: 'v1',
      source_manifest_hash: 'manifest-a',
    }))

    const otherRunScope = methylationRequestScope({
      cohort: 'hgsvc_hprc',
      chrom: 'chr22',
      start: 100,
      stop: 200,
      dataLayer: 'SAMPLE_TOTAL',
      source: {
        modality: 'METHYLATION',
        source: 'LEGACY_V1',
        run_id: 'run-b',
        source_manifest_hash: 'manifest-b',
        orientation_receipt: 'orientation-b',
      },
      enabled: true,
    })
    expect(methylationRecordIdentity(scope, base))
      .not.toBe(methylationRecordIdentity(otherRunScope, base))
  })
})

describe('methylation completion metadata', () => {
  test('marks a successful compatibility batch complete when it returns zero CpG rows', () => {
    expect(methylationBatchFromGraphQL(
      { data: { methylation: [] } },
      ['sample-with-no-regional-cpgs']
    )).toEqual({
      records: [],
      completedSampleIds: ['sample-with-no-regional-cpgs'],
    })
  })

  test('uses explicit completion identities from a future envelope', () => {
    expect(methylationBatchFromGraphQL({
      data: {
        methylation_region: {
          records: [],
          completed_sample_ids: ['sample-a'],
        },
      },
    }, ['sample-a', 'sample-b'])).toEqual({
      records: [],
      completedSampleIds: ['sample-a'],
    })
  })
})

describe('scoped monotonic methylation requests', () => {
  test('rejects deferred HGSVC responses after HGSVC -> AoU -> HGSVC', async () => {
    const gate = new MethylationRequestGate()
    const firstHgsvc = gate.begin('hgsvc:chr22:100-200')
    let resolveFirst!: (value: string) => void
    let firstSignal: AbortSignal | undefined
    const deferred = responseForCurrentMethylationRequest(
      gate,
      firstHgsvc,
      (signal) => new Promise<string>((resolve) => {
        firstSignal = signal
        resolveFirst = resolve
      })
    )

    const aou = gate.begin('aou:chr22:100-200')
    const secondHgsvc = gate.begin('hgsvc:chr22:100-200')
    resolveFirst('stale HGSVC response')

    await expect(deferred).resolves.toBeUndefined()
    await expect(responseForCurrentMethylationRequest(
      gate,
      secondHgsvc,
      async () => 'current HGSVC response'
    )).resolves.toBe('current HGSVC response')
    expect(firstSignal?.aborted).toBe(true)
    expect(aou.controller.signal.aborted).toBe(true)
    expect(gate.isCurrent(secondHgsvc)).toBe(true)
    expect(secondHgsvc.id).toBeGreaterThan(firstHgsvc.id)
  })

  test('aborts and rejects a late load-all batch across a region transition', () => {
    const gate = new MethylationRequestGate()
    const oldRegion = gate.begin('hgsvc:chr22:100-200')
    const newRegion = gate.begin('hgsvc:chr22:300-400')

    expect(oldRegion.controller.signal.aborted).toBe(true)
    expect(gate.isCurrent(oldRegion)).toBe(false)
    expect(gate.isCurrent(newRegion)).toBe(true)
  })
})
