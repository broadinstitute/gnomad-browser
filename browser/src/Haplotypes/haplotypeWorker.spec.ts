import { jest } from '@jest/globals'
import { MessageChannel } from 'node:worker_threads'

import { normalizeHaplotypeWorkerData } from './haplotypeCompute'

const cloneThroughMessageChannel = <T>(value: T): Promise<T> => new Promise((resolve) => {
  const { port1, port2 } = new MessageChannel()
  port1.once('message', (cloned) => {
    port1.close()
    port2.close()
    resolve(cloned)
  })
  port2.postMessage(value)
})

const variants = {
  variant_id: ['variant-1', 'variant-2'],
  chrom: ['chr22', 'chr22'],
  pos: [100, 200],
  end: [null, null],
  ref: ['A', 'C'],
  alt: ['G', 'T'],
  allele_type: ['snv', 'snv'],
  allele_length: [0, 0],
  freq_af: [0.5, 0.01],
  freq_ac: [1, 1],
  freq_an: [4, 4],
  rsid: ['', ''],
  cadd_phred: [null, null],
  phylop: [null, null],
  sv_consequences: [null, null],
  dbsnp_id: [null, null],
  tr_id: [null, null],
  tr_motifs: [null, null],
  gnomad_str: [null, null],
  allele_methylation: [null, null],
  motif_counts: [null, null],
  allele_purity: [null, null],
  short_read_match_id: [null, null],
  populations: [[], []],
}

describe('haplotype worker VCF carrier identity', () => {
  test('retains and re-freezes two phase sets across READY and diploid UPDATE', async () => {
    jest.resetModules()
    const postMessage = jest.fn()
    Object.defineProperty(globalThis, 'postMessage', {
      value: postMessage,
      configurable: true,
      writable: true,
    })

    // eslint-disable-next-line global-require
    require('./haplotypeWorker')
    const onmessage = (globalThis as any).onmessage
    expect(typeof onmessage).toBe('function')

    onmessage({
      data: {
        type: 'INIT',
        requestGeneration: 7,
        computeGeneration: 11,
        representationIdentity: 'diploid-v1',
        rawData: {
          variants,
          carrier_variant_indices: { 'sample-1:2': [0, 1] },
          carriers: [{
            sample_id: 'sample-1',
            vcf_strand: 2,
            phase_set: null,
            phase_sets: ['ps-a', 'ps-b'],
            variant_indices: [0, 1],
            phase_set_by_variant: [
              { variant_index: 0, phase_set: 'ps-a' },
              { variant_index: 1, phase_set: 'ps-b' },
            ],
          }],
        },
        minAf: 0,
        sortBy: 'sample_count',
        isDiploidView: false,
        regionSize: 1_000,
      },
    })

    const ready = postMessage.mock.calls
      .map(([message]) => message as any)
      .find((message) => message.type === 'READY')
    expect(ready).toMatchObject({
      requestGeneration: 7,
      computeGeneration: 11,
      representationIdentity: 'diploid-v1',
    })
    expect(ready.data.groups[0].samples[0]).toMatchObject({
      sample_id: 'sample-1',
      vcf_strand: 2,
      phase_set: null,
    })
    const expectedSidecar = {
      by_carrier: {
        'sample-1:2': {
          sample_id: 'sample-1',
          vcf_strand: 2,
          phase_set: null,
          phase_sets: ['ps-a', 'ps-b'],
          variant_indices: [0, 1],
          phase_set_by_variant: [
            { variant_index: 0, phase_set: 'ps-a' },
            { variant_index: 1, phase_set: 'ps-b' },
          ],
        },
      },
      variant_ids_by_index: ['variant-1', 'variant-2'],
    }
    expect(ready.data.phase_set_sidecar).toEqual(expectedSidecar)

    const readyAfterWorkerBoundary = await cloneThroughMessageChannel(ready.data)
    expect(Object.isFrozen(readyAfterWorkerBoundary.phase_set_sidecar)).toBe(false)
    expect(Object.isFrozen(readyAfterWorkerBoundary.phase_set_sidecar.by_carrier['sample-1:2'])).toBe(false)
    expect(Object.isFrozen(readyAfterWorkerBoundary.phase_set_sidecar.by_carrier['sample-1:2'].phase_sets)).toBe(false)
    expect(Object.isFrozen(readyAfterWorkerBoundary.phase_set_sidecar.by_carrier['sample-1:2'].phase_set_by_variant)).toBe(false)
    expect(Object.isFrozen(readyAfterWorkerBoundary.phase_set_sidecar.variant_ids_by_index)).toBe(false)

    const normalizedReady = normalizeHaplotypeWorkerData(readyAfterWorkerBoundary)
    const normalizedReadyCarrier = normalizedReady.phase_set_sidecar.by_carrier['sample-1:2']
    expect(normalizedReady.phase_set_sidecar).toEqual(expectedSidecar)
    expect(Object.isFrozen(normalizedReady.phase_set_sidecar)).toBe(true)
    expect(Object.isFrozen(normalizedReady.phase_set_sidecar.by_carrier)).toBe(true)
    expect(Object.isFrozen(normalizedReadyCarrier)).toBe(true)
    expect(Object.isFrozen(normalizedReadyCarrier.variant_indices)).toBe(true)
    expect(Object.isFrozen(normalizedReadyCarrier.phase_sets)).toBe(true)
    expect(Object.isFrozen(normalizedReadyCarrier.phase_set_by_variant)).toBe(true)
    expect(normalizedReadyCarrier.phase_set_by_variant?.every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(normalizedReady.phase_set_sidecar.variant_ids_by_index)).toBe(true)

    onmessage({
      data: {
        type: 'UPDATE_AF',
        requestGeneration: 7,
        computeGeneration: 12,
        representationIdentity: 'diploid-v2',
        minAf: 1,
        isClusteredView: false,
        clusterThreshold: 0,
        sortBy: 'sample_id',
        isDiploidView: true,
        distanceMetric: 'auto',
      },
    })
    const updated = postMessage.mock.calls
      .map(([message]) => message as any)
      .filter((message) => message.type === 'UPDATED')
      .at(-1)

    expect(updated).toMatchObject({
      requestGeneration: 7,
      computeGeneration: 12,
      representationIdentity: 'diploid-v2',
    })
    expect(updated.data.groups[0].samples[0].phase_set_mapping.phaseSetA).toBeNull()
    expect(updated.data.phase_set_sidecar).toEqual(ready.data.phase_set_sidecar)

    const normalizedUpdated = normalizeHaplotypeWorkerData(
      await cloneThroughMessageChannel(updated.data)
    )
    const normalizedUpdatedCarrier = normalizedUpdated.phase_set_sidecar.by_carrier['sample-1:2']
    expect(normalizedUpdated.phase_set_sidecar).toEqual(expectedSidecar)
    expect(Object.isFrozen(normalizedUpdated.phase_set_sidecar)).toBe(true)
    expect(Object.isFrozen(normalizedUpdated.phase_set_sidecar.by_carrier)).toBe(true)
    expect(Object.isFrozen(normalizedUpdatedCarrier)).toBe(true)
    expect(Object.isFrozen(normalizedUpdatedCarrier.variant_indices)).toBe(true)
    expect(Object.isFrozen(normalizedUpdatedCarrier.phase_sets)).toBe(true)
    expect(Object.isFrozen(normalizedUpdatedCarrier.phase_set_by_variant)).toBe(true)
    expect(normalizedUpdatedCarrier.phase_set_by_variant?.every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(normalizedUpdated.phase_set_sidecar.variant_ids_by_index)).toBe(true)
  })

  test('INIT honors the caller-requested clustered representation over payload defaults', () => {
    jest.resetModules()
    const postMessage = jest.fn()
    Object.defineProperty(globalThis, 'postMessage', {
      value: postMessage,
      configurable: true,
      writable: true,
    })

    // eslint-disable-next-line global-require
    require('./haplotypeWorker')
    const onmessage = (globalThis as any).onmessage

    onmessage({
      data: {
        type: 'INIT',
        requestGeneration: 8,
        computeGeneration: 13,
        representationIdentity: 'similarity-after-pending-rest',
        rawData: {
          variants,
          carrier_variant_indices: {
            'sample-1:1': [0],
            'sample-2:1': [1],
          },
          auto_defaults: {
            floor: 0,
            ceiling: 1,
            defaultAf: 0,
            defaultClusterThreshold: 0.01,
            isClusteredView: false,
          },
        },
        minAf: 0,
        isClusteredView: true,
        sortBy: 'similarity_score',
        isDiploidView: false,
        distanceMetric: 'auto',
        regionSize: 1_000,
      },
    })

    const ready = postMessage.mock.calls
      .map(([message]) => message as any)
      .find((message) => message.type === 'READY')
    expect(ready).toMatchObject({
      requestGeneration: 8,
      computeGeneration: 13,
      representationIdentity: 'similarity-after-pending-rest',
    })
    expect(ready.data.clusters).toBeDefined()
  })

  test('passes a target descriptor through INIT and returns display-only assignments', async () => {
    jest.resetModules()
    const postMessage = jest.fn()
    Object.defineProperty(globalThis, 'postMessage', {
      value: postMessage,
      configurable: true,
      writable: true,
    })

    // eslint-disable-next-line global-require
    require('./haplotypeWorker')
    const onmessage = (globalThis as any).onmessage
    const targetVariants = {
      ...variants,
      variant_id: ['flank~1', 'not-selected-by-variant-id'],
      source_variant_id: ['flank', 'target-source'],
      alt_index: [1, 2],
      alt_count: [1, 2],
      pos: [100, 150],
      allele_type: ['snv', 'trv'],
      allele_length: [0, 3],
      freq_af: [0.5, 0.25],
      freq_ac: [1, 2],
    }

    onmessage({
      data: {
        type: 'INIT',
        rawData: {
          variants: targetVariants,
          carrier_variant_indices: {
            'sample-with-flanks:1': [0, 1],
            'sample-without-flanks:1': [1],
          },
          target_descriptor: {
            canonical_envelope: { chrom: 'chr22', start: 150, stop: 151 },
            source_variant_ids: ['target-source'],
            selected_exact_allele_id: 'target-source~2',
            fixed_window: {
              chrom: 'chr22', start: 0, stop: 50_151, flank_size: 50_000,
            },
          },
        },
        minAf: 0,
        isClusteredView: true,
        sortBy: 'similarity_score',
        isDiploidView: false,
        distanceMetric: 'all',
        regionSize: 50_151,
      },
    })

    const ready = postMessage.mock.calls
      .map(([message]) => message as any)
      .find((message) => message.type === 'READY')
    expect(ready.data.groups).toHaveLength(1)
    expect(ready.data.groups[0].variants.variants.map((entry: any) => entry.variant_id))
      .toEqual(['flank~1'])
    expect(ready.data.target_display_sidecar).toMatchObject({
      by_carrier: {
        'sample-with-flanks:1': {
          exact_allele_ids: ['target-source~2'],
          is_selected_exact_allele: true,
          flanking_signature_status: 'usable',
        },
        'sample-without-flanks:1': {
          exact_allele_ids: ['target-source~2'],
          is_selected_exact_allele: true,
          flanking_signature_status: 'no_usable_flanking_signature',
        },
      },
      counts: {
        selected_exact_allele_assigned_copy_count: 2,
        selected_exact_allele_no_usable_flanking_signature_copy_count: 1,
      },
    })

    const cloned = await cloneThroughMessageChannel(ready.data)
    expect(Object.isFrozen(cloned.target_display_sidecar)).toBe(false)
    const normalized = normalizeHaplotypeWorkerData(cloned)
    expect(Object.isFrozen(normalized.target_display_sidecar)).toBe(true)
    expect(Object.isFrozen(normalized.target_display_sidecar?.descriptor.fixed_window)).toBe(true)
    expect(Object.isFrozen(
      normalized.target_display_sidecar?.by_carrier['sample-with-flanks:1'].exact_allele_ids
    )).toBe(true)
  })

  test('reports malformed payload failures instead of leaving the last progress message stuck', () => {
    jest.resetModules()
    const postMessage = jest.fn()
    Object.defineProperty(globalThis, 'postMessage', {
      value: postMessage,
      configurable: true,
      writable: true,
    })

    // eslint-disable-next-line global-require
    require('./haplotypeWorker')
    const onmessage = (globalThis as any).onmessage

    expect(() => onmessage({
      data: {
        type: 'INIT',
        rawData: { error: 'Internal error' },
      },
    })).not.toThrow()

    expect(postMessage.mock.calls.map(([message]) => (message as any).type)).toEqual([
      'PROGRESS',
      'ERROR',
    ])
    expect(postMessage.mock.calls[1][0]).toMatchObject({
      type: 'ERROR',
      error: expect.stringContaining('variant_id'),
    })
  })
})
