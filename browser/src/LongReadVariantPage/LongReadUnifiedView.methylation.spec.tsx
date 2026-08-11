import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockCarrierSampleIds = [
  'carrier-a',
  'carrier-b',
  'carrier-c',
  'carrier-d',
  'carrier-e',
  'carrier-f',
]
const mockSourceSampleIds = [
  ...mockCarrierSampleIds,
  ...Array.from({ length: 225 }, (_, index) => `source-${String(index).padStart(3, '0')}`),
].sort((left, right) => left.localeCompare(right))
let mockVisibleSampleIds = mockCarrierSampleIds
const mockHaplotypeTrackProps: any[] = []
const mockLegendProps: any[] = []
let mockJoinedCapability: any = null
let mockJoinedCapabilityFailure: 'graphql' | 'network' | null = null
let mockDeferJoinedCapability = false
let mockDeferHaplotype = false
const mockComputeHaplotypeViewCalls: any[][] = []

jest.mock('../Haplotypes/haplotypeCompute', () => {
  const actual: any = jest.requireActual('../Haplotypes/haplotypeCompute')
  return {
    ...actual,
    computeHaplotypeView: (...args: any[]) => {
      mockComputeHaplotypeViewCalls.push(args)
      return actual.computeHaplotypeView(...args)
    },
  }
})

jest.mock('@gnomad/region-viewer', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    PositionAxisTrack: () => null,
    Track: ({ renderLeftPanel, children }: any) => mockReact.createElement(
      'div', null, renderLeftPanel(), children({ scalePosition: (position: number) => position, width: 1000 })
    ),
  }
})

jest.mock('@gnomad/ui', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    Select: ({ children, ...props }: any) => mockReact.createElement('select', props, children),
  }
})

jest.mock('../TrackPage', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    TrackPageSection: ({ children }: any) => mockReact.createElement('section', null, children),
  }
})

jest.mock('../Haplotypes', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  const HaplotypeTrack = mockReact.forwardRef((props: any, _ref: any) => {
    mockHaplotypeTrackProps.push(props)
    mockReact.useEffect(() => {
      props.onVisibleDiploidSampleIdsChange?.(mockVisibleSampleIds)
    }, [props.start, props.stop, props.showPerCopyMethylation])
    return mockReact.createElement(
      'div',
      { 'data-testid': 'haplotype-rows' },
      mockReact.createElement('button', {
        type: 'button',
        'data-testid': 'load-all',
        disabled: props.methylationLoading,
        onClick: props.onLoadAllSamples,
      }, 'Load all'),
      mockReact.createElement(
        'span',
        { 'data-testid': 'detail-status' },
        `${props.methylationLoading}:${props.methylationSampleCount}/${props.methylationTotalSamples}`
      )
    )
  })
  const Legend = (props: any) => {
    mockLegendProps.push(props)
    const visible = props.visibleMethylationProgress
    const visibleLabel =
      visible?.status === 'error'
        ? `Methylation loading error for visible samples (${visible.errorCodes.join(', ')})`
        : visible?.status === 'loading'
        ? `Loading methylation ${visible.terminalCount}/${visible.totalCount} visible samples…`
        : visible?.status === 'loaded'
        ? `Loaded ${visible.totalCount} visible samples`
        : visible?.status === 'empty'
        ? 'No visible methylation samples'
        : null
    return mockReact.createElement(
      'div',
      null,
      mockReact.createElement(
        'label',
        null,
        mockReact.createElement('input', {
          type: 'checkbox',
          'aria-label': 'Per-copy methylation',
          checked: props.showPerCopyMethylation && props.joinedMethylationUsableForRegion,
          disabled: !props.joinedMethylationUsableForRegion,
          onChange: (event: any) => props.onShowPerCopyMethylationChange(event.target.checked),
        }),
        'Per-copy methylation'
      ),
      props.joinedMethylationUsableForRegion
        ? mockReact.createElement(
            'label',
            null,
            mockReact.createElement('input', {
              type: 'checkbox',
              'aria-label': 'Methylation samples only',
              checked: props.methylationSamplesOnly,
              onChange: (event: any) => props.onMethylationSamplesOnlyChange(event.target.checked),
            }),
            'Methylation samples only'
          )
        : null,
      visibleLabel ? mockReact.createElement('span', { role: 'status' }, visibleLabel) : null,
      props.showPerCopyMethylation && props.joinedMethylationUsableForRegion
        ? mockReact.createElement(
            'button',
            {
              type: 'button',
              onClick: props.onLoadAllPerCopyMethylation,
              disabled: Boolean(props.allMethylationProgress),
            },
            'Load all methylation samples'
          )
        : null,
      props.showPerCopyMethylation &&
      (props.visibleMethylationProgress?.status === 'error' ||
        props.allMethylationProgress?.status === 'error')
        ? mockReact.createElement(
            'button',
            { type: 'button', onClick: props.onRetryPerCopyMethylation },
            'Retry methylation'
          )
        : null,
      !props.joinedMethylationUsableForRegion && props.joinedMethylationUnavailableReason
        ? mockReact.createElement(
            'span',
            { role: 'status' },
            props.joinedMethylationUnavailableReason
          )
        : null
    )
  }
  return {
    __esModule: true,
    default: HaplotypeTrack,
    Legend,
    normalizeSelectableGroupingMode: (mode: string) => mode === 'diplotype' ? 'diploid' : mode,
  }
})

jest.mock('../RegionViewerCursor', () => () => null)
jest.mock('../Haplotypes/createHaplotypeWorker', () => ({
  createHaplotypeWorker: () => new globalThis.Worker('mock-worker'),
}))
jest.mock('../Haplotypes/HaplotypeVariantTable', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    __esModule: true,
    default: mockReact.forwardRef(() => null),
  }
})
jest.mock('../Haplotypes/RecombinationRate', () => () => null)
jest.mock('../Haplotypes/MQTLTrack', () => () => null)
jest.mock('./LongReadViewControls', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return ({ showHaplotypes, onChangeShowHaplotypes }: any) => mockReact.createElement(
    'fieldset',
    null,
    mockReact.createElement('label', null,
      mockReact.createElement('input', {
        type: 'radio',
        name: 'view-mode',
        checked: !showHaplotypes,
        onChange: () => onChangeShowHaplotypes(false),
      }),
      'Summary View'
    ),
    mockReact.createElement('label', null,
      mockReact.createElement('input', {
        type: 'radio',
        name: 'view-mode',
        checked: showHaplotypes,
        onChange: () => onChangeShowHaplotypes(true),
      }),
      'Haplotype View'
    )
  )
})
jest.mock('./LongReadViewHelpButton', () => () => null)
jest.mock('./LongReadVariantTrack', () => () => null)
jest.mock('./VariantDensityTrack', () => () => null)
jest.mock('./LRUniqueDensityTrack', () => () => null)
jest.mock('../VariantList/Variants', () => () => null)
jest.mock('../Haplotypes/ZoomOverview', () => () => null)
jest.mock('../Haplotypes/AccordionRegionViewer', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return ({ children }: any) => mockReact.createElement('div', null, children)
})
jest.mock('../Haplotypes/AccordionPositionAxis', () => ({
  AccordionPositionAxisTrack: () => null,
}))
jest.mock('../Haplotypes/AccordionCoordinateMapper', () => ({
  AccordionCoordinateMapper: function AccordionCoordinateMapper() {},
}))

// Jest mocks must be registered before importing the component under test.
// eslint-disable-next-line import/first
import LongReadUnifiedView, { haplotypeRequestScope } from './LongReadUnifiedView'
import { perCopyMethylationForReadyRow } from './perCopyMethylation'

type DeferredGraphQLRequest = {
  name: string
  variables: any
  signal?: AbortSignal
  resolve: (response: any) => void
  reject: (error: Error) => void
}

const mockGraphQLRequests: DeferredGraphQLRequest[] = []

const responseWithJson = (payload: any) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(payload),
})

const joinedIdentity = {
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

const confirmedCapability = (overrides: Record<string, unknown> = {}) => ({
  available: true,
  joinable_to_vcf: true,
  status: 'AVAILABLE_CONFIRMED',
  identity: joinedIdentity,
  max_span_bp: 100000,
  max_samples: 25,
  max_records: 250000,
  reason: 'Confirmed for the pinned bundle',
  source_sample_ids: mockSourceSampleIds,
  ...overrides,
})

const workerData = () => ({
  groups: [{
    is_diplotype: true,
    samples: mockCarrierSampleIds.map((sampleId) => ({
      sample_id: sampleId,
        strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    })),
    haplotypeA: { variants: [], readable_id: '' },
    haplotypeB: { variants: [], readable_id: '' },
    below_thresholdA: { variants: [], readable_id: '' },
    below_thresholdB: { variants: [], readable_id: '' },
    start: 100,
    stop: 200,
    hash: 1,
    roh_fraction: 0,
    is_roh: false,
    compound_het_pairs: [],
    is_compound_het: false,
  }],
  phase_set_sidecar: {
    by_carrier: {},
    variant_ids_by_index: [],
  },
})

let workerDataOverride: ReturnType<typeof workerData> | null = null
let mockWorkerAutoRespond = true
const mockWorkers: MockWorker[] = []

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null

  onerror: (() => void) | null = null

  messages: any[] = []

  constructor() { mockWorkers.push(this) }

  postMessage(message: any) {
    this.messages.push(message)
    if (mockWorkerAutoRespond) {
      // Real workers always cross an asynchronous message boundary.
      Promise.resolve().then(() => this.respond(message))
    }
  }

  respond(
    message: any,
    data = workerDataOverride || workerData(),
    representationIdentity = message.representationIdentity
  ) {
    const type = message.type === 'INIT' ? 'READY' : 'UPDATED'
    this.onmessage?.({
      data: {
        type,
        data: JSON.parse(JSON.stringify(data)),
        requestGeneration: message.requestGeneration,
        computeGeneration: message.computeGeneration,
        representationIdentity,
      },
    } as MessageEvent)
  }

  terminate() { this.onmessage = null }
}

const requestsNamed = (name: string) => mockGraphQLRequests.filter((request) => request.name === name)

const joinedRegion = (
  requestedSampleIds: string[],
  completedSampleIds: string[],
  unavailableSamples: any[] = [],
  records: any[] = []
) => ({
  identity: joinedIdentity,
  requested_sample_ids: requestedSampleIds,
  completed_sample_ids: completedSampleIds,
  unavailable_samples: unavailableSamples,
  records,
})

const joinedRecord = (sampleId: string, index: number) => ({
  source_row_key: `${sampleId}-${index}`,
  chr: 'chr22',
  pos1: 110 + index,
  pos2: 111 + index,
  sample: sampleId,
  methylation: 25,
  coverage: 4,
  source_haplotype: 'HAP1',
  vcf_strand: 1,
  mapping_scope: 'CHROMOSOME_WIDE',
  phase_set: null,
})

const joinedRecordForStrand = (sampleId: string, vcfStrand: 1 | 2, methylation: number) => ({
  ...joinedRecord(sampleId, vcfStrand),
  source_row_key: `${sampleId}-GT${vcfStrand}`,
  pos1: 110,
  pos2: 111,
  methylation,
  source_haplotype: vcfStrand === 1 ? 'HAP1' : 'HAP2',
  vcf_strand: vcfStrand,
})

const resolveRequest = async (request: DeferredGraphQLRequest, payload: any) => {
  await act(async () => {
    request.resolve(responseWithJson(payload))
    await Promise.resolve()
    await Promise.resolve()
  })
}

const rejectRequest = async (request: DeferredGraphQLRequest, error: Error) => {
  await act(async () => {
    request.reject(error)
    await Promise.resolve()
    await Promise.resolve()
  })
}

const renderView = (
  gene = { chrom: 'chr22', start: 100, stop: 200 },
  initialEntry = '/?show_haplotypes=true',
  lrCohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc'
) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
      <LongReadUnifiedView
        datasetId={'gnomad_r4' as any}
        gene={gene}
        variants={[]}
        lrCohort={lrCohort}
      />
  </MemoryRouter>
)

const enablePerCopyMethylation = async () => {
  const control = await screen.findByLabelText('Per-copy methylation')
  await waitFor(() => expect((control as HTMLInputElement).disabled).toBe(false))
  if (!(control as HTMLInputElement).checked) fireEvent.click(control)
}

beforeEach(() => {
  mockVisibleSampleIds = mockCarrierSampleIds
  mockGraphQLRequests.length = 0
  mockHaplotypeTrackProps.length = 0
  mockLegendProps.length = 0
  mockJoinedCapabilityFailure = null
  mockDeferJoinedCapability = false
  mockDeferHaplotype = false
  mockJoinedCapability = {
    available: false,
    joinable_to_vcf: false,
    status: 'UNAVAILABLE_NOT_CONFIGURED',
    identity: null,
    source_sample_ids: [],
    max_span_bp: 100000,
    max_samples: 25,
    max_records: 250000,
    reason: 'No admitted joined route',
  }
  workerDataOverride = null
  mockWorkerAutoRespond = true
  mockWorkers.length = 0
  mockComputeHaplotypeViewCalls.length = 0
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: MockWorker,
  })
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'time').mockImplementation(() => {})
  jest.spyOn(console, 'timeEnd').mockImplementation(() => {})

  const fetchMock = jest.fn((input: any, init?: any) => {
    if (String(input).startsWith('/api/lr/haplotype-groups')) {
      const response = responseWithJson({
        variants: { variant_id: [] },
        carrier_variant_indices: {},
        carriers: [],
        auto_defaults: {
          floor: 0,
          ceiling: 1,
          defaultAf: 0,
          defaultClusterThreshold: 0,
          isClusteredView: false,
        },
      })
      if (mockDeferHaplotype) {
        return new Promise((resolve, reject) => {
          mockGraphQLRequests.push({
            name: 'HaplotypeREST',
            variables: Object.fromEntries(new URL(String(input), 'http://test').searchParams),
            signal: init?.signal,
            resolve,
            reject,
          })
        }) as any
      }
      return Promise.resolve(response as any)
    }

    const body = JSON.parse(init?.body || '{}')
    const name = body.query?.match(/query\s+(\w+)/)?.[1] || 'unknown'
    if (name === 'RegionSampleMetadata') {
      return Promise.resolve(responseWithJson({ data: { sample_metadata: [] } }) as any)
    }
    if (name === 'RegionJoinedPhasedMethylationCapability') {
      if (mockDeferJoinedCapability) {
        return new Promise((resolve, reject) => {
          mockGraphQLRequests.push({
            name,
            variables: body.variables,
            signal: init?.signal,
            resolve,
            reject,
          })
        }) as any
      }
      if (mockJoinedCapabilityFailure === 'graphql') {
        return Promise.resolve(
          responseWithJson({
            data: null,
            errors: [{ message: 'Cannot query field joined_phased_methylation_capability' }],
          }) as any
        )
      }
      if (mockJoinedCapabilityFailure === 'network') {
        return Promise.reject(new Error('API connection refused'))
      }
      return Promise.resolve(responseWithJson({
          data: { joined_phased_methylation_capability: mockJoinedCapability },
      }) as any)
    }

    return new Promise((resolve, reject) => {
      mockGraphQLRequests.push({
        name,
        variables: body.variables,
        signal: init?.signal,
        resolve,
        reject,
      })
    }) as any
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchMock,
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  delete (globalThis as any).fetch
})

const haplotypeRestCalls = () => (globalThis.fetch as jest.Mock).mock.calls.filter(
  ([input]: [unknown]) => String(input).startsWith('/api/lr/haplotype-groups')
)

const dataForSample = (sampleId: string) => {
  const data = workerData()
  data.groups[0].samples = [{
    sample_id: sampleId,
    strand_mapping: { strandA: 1, strandB: 2 },
    phase_set_mapping: { phaseSetA: null, phaseSetB: null },
  }]
  return data
}

describe('LongReadUnifiedView haplotype request ownership', () => {
  test('is lazy on Summary and reuses one REST payload and one INIT on same-scope re-entry', async () => {
    renderView(undefined, '/')

    expect(mockWorkers).toHaveLength(0)
    expect(haplotypeRestCalls()).toHaveLength(0)

    fireEvent.click(screen.getByRole('radio', { name: 'Haplotype View' }))
    await waitFor(() => expect(haplotypeRestCalls()).toHaveLength(1))
    await waitFor(() => expect(mockWorkers).toHaveLength(1))
    await waitFor(() => {
      expect(mockWorkers[0].messages.filter((message) => message.type === 'INIT')).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Summary View' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Haplotype View' }))
    await act(async () => { await Promise.resolve() })

    expect(haplotypeRestCalls()).toHaveLength(1)
    expect(mockWorkers).toHaveLength(1)
    expect(mockWorkers[0].messages.filter((message) => message.type === 'INIT')).toHaveLength(1)
  })

  test('uses the live caller-requested similarity mode for INIT after a rapid pending-REST toggle', async () => {
    mockDeferHaplotype = true
    mockWorkerAutoRespond = false
    renderView()
    await waitFor(() => expect(requestsNamed('HaplotypeREST')).toHaveLength(1))
    await waitFor(() => expect(mockWorkers).toHaveLength(1))

    act(() => mockLegendProps.at(-1).onGroupingModeChange('similarity'))
    await resolveRequest(requestsNamed('HaplotypeREST')[0], {
      variants: { variant_id: [] },
      carrier_variant_indices: {},
      carriers: [],
      auto_defaults: {
        floor: 0,
        ceiling: 1,
        defaultAf: 0,
        defaultClusterThreshold: 0.01,
        isClusteredView: false,
      },
    })

    await waitFor(() => {
      expect(mockWorkers[0].messages.filter((message) => message.type === 'INIT')).toHaveLength(1)
    })
    const init = mockWorkers[0].messages.find((message) => message.type === 'INIT')
    expect(init).toMatchObject({ isClusteredView: true, isDiploidView: false })
    expect(JSON.parse(init.representationIdentity)[1]).toBe(true)
  })

  test('uses caller-requested similarity mode in main-thread fallback after a pending-REST toggle', async () => {
    mockDeferHaplotype = true
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: function UnavailableWorker() { throw new Error('worker unavailable') },
    })
    renderView()
    await waitFor(() => expect(requestsNamed('HaplotypeREST')).toHaveLength(1))

    act(() => mockLegendProps.at(-1).onGroupingModeChange('similarity'))
    await resolveRequest(requestsNamed('HaplotypeREST')[0], {
      variants: { variant_id: [] },
      carrier_variant_indices: {},
      carriers: [],
      auto_defaults: {
        floor: 0,
        ceiling: 1,
        defaultAf: 0,
        defaultClusterThreshold: 0.01,
        isClusteredView: false,
      },
    })

    await waitFor(() => expect(mockComputeHaplotypeViewCalls).toHaveLength(1))
    expect(mockComputeHaplotypeViewCalls[0][4]).toBe(true)
    expect(mockComputeHaplotypeViewCalls[0][7]).toBe(false)
    expect(mockWorkers).toHaveLength(0)
    expect(mockHaplotypeTrackProps.at(-1).viewportStatus?.kind).toBe('empty')
  })

  test('falls back to retained main-thread raw data when the worker errors before REST resolves', async () => {
    mockDeferHaplotype = true
    mockWorkerAutoRespond = false
    renderView()
    await waitFor(() => expect(requestsNamed('HaplotypeREST')).toHaveLength(1))
    await waitFor(() => expect(mockWorkers).toHaveLength(1))
    const failedWorker = mockWorkers[0]

    act(() => failedWorker.onerror?.())
    await resolveRequest(requestsNamed('HaplotypeREST')[0], {
      variants: { variant_id: [] },
      carrier_variant_indices: {},
      carriers: [],
      auto_defaults: {
        floor: 0,
        ceiling: 1,
        defaultAf: 0,
        defaultClusterThreshold: 0.01,
        isClusteredView: false,
      },
    })

    await waitFor(() => expect(mockComputeHaplotypeViewCalls).toHaveLength(1))
    expect(failedWorker.messages).toHaveLength(0)
    expect(mockHaplotypeTrackProps.at(-1).viewportStatus?.kind).toBe('empty')

    act(() => mockLegendProps.at(-1).onGroupingModeChange('similarity'))
    await waitFor(() => expect(mockComputeHaplotypeViewCalls).toHaveLength(2))
    expect(haplotypeRestCalls()).toHaveLength(1)
    expect(failedWorker.messages).toHaveLength(0)
  })

  test('rejects a worker response with current generations but the wrong representation identity', async () => {
    mockWorkerAutoRespond = false
    renderView()
    await waitFor(() => expect(mockWorkers[0]?.messages.filter((message) => message.type === 'INIT')).toHaveLength(1))
    const worker = mockWorkers[0]
    const init = worker.messages.find((message) => message.type === 'INIT')

    act(() => worker.respond(init, dataForSample('wrong-representation'), 'wrong-representation'))
    expect(mockHaplotypeTrackProps.at(-1).haplotypeGroups).toEqual([])

    act(() => worker.respond(init, dataForSample('current-representation')))
    await waitFor(() => {
      expect(mockHaplotypeTrackProps.at(-1).haplotypeGroups[0].samples[0].sample_id).toBe(
        'current-representation'
      )
    })
  })

  test('drops stale region READY and grouping UPDATED responses', async () => {
    mockWorkerAutoRespond = false
    const rendered = renderView()
    await waitFor(() => expect(mockWorkers[0]?.messages.filter((message) => message.type === 'INIT')).toHaveLength(1))
    const worker = mockWorkers[0]
    const oldRegionInit = worker.messages.find((message) => message.type === 'INIT')

    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr22', start: 300, stop: 400 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )
    await waitFor(() => expect(mockWorkers).toHaveLength(2))
    const currentWorker = mockWorkers[1]
    await waitFor(() => {
      expect(currentWorker.messages.filter((message) => message.type === 'INIT')).toHaveLength(1)
    })
    const currentRegionInit = currentWorker.messages.find((message) => message.type === 'INIT')

    act(() => worker.respond(oldRegionInit, dataForSample('stale-region')))
    expect(mockHaplotypeTrackProps.at(-1).haplotypeGroups).toEqual([])

    act(() => currentWorker.respond(currentRegionInit, dataForSample('current-region')))
    await waitFor(() => {
      expect(mockHaplotypeTrackProps.at(-1).haplotypeGroups[0].samples[0].sample_id).toBe(
        'current-region'
      )
    })

    act(() => mockLegendProps.at(-1).onGroupingModeChange('similarity'))
    await waitFor(() => {
      expect(currentWorker.messages.filter((message) => message.type === 'UPDATE_AF')).toHaveLength(1)
    })
    const staleGroupingUpdate = currentWorker.messages.find(
      (message) => message.type === 'UPDATE_AF'
    )
    act(() => mockLegendProps.at(-1).onGroupingModeChange('diploid'))
    await act(async () => { await Promise.resolve() })
    act(() => currentWorker.respond(staleGroupingUpdate, dataForSample('stale-grouping')))

    expect(mockHaplotypeTrackProps.at(-1).haplotypeGroups[0].samples[0].sample_id).toBe(
      'current-region'
    )
  })

  test('aborts an in-flight REST request when its scope changes', async () => {
    mockDeferHaplotype = true
    const rendered = renderView()
    await waitFor(() => expect(requestsNamed('HaplotypeREST')).toHaveLength(1))
    const staleRequest = requestsNamed('HaplotypeREST')[0]

    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr22', start: 300, stop: 400 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(requestsNamed('HaplotypeREST')).toHaveLength(2))
    expect(staleRequest.signal?.aborted).toBe(true)
    await resolveRequest(staleRequest, {
      variants: { variant_id: [] },
      carrier_variant_indices: {},
      carriers: [],
    })
    expect(mockWorkers.flatMap((worker) => worker.messages)).toHaveLength(0)
  })

  test('scope identity changes for cohort, region, dataset, and source provenance', () => {
    const base = {
      datasetId: 'gnomad_r4' as any,
      cohort: 'hgsvc_hprc' as const,
      chrom: 'chr22',
      start: 100,
      stop: 200,
      provenance: {
        enabled: true,
        sources: [{
          modality: 'HAPLOTYPES',
          source: 'Y1_ACCEPTED' as const,
          run_id: 'run-1',
          database: 'db-1',
          available: true,
          label: 'accepted',
        }],
      },
    }
    const identity = haplotypeRequestScope(base)
    expect(haplotypeRequestScope({ ...base, cohort: 'aou' })).not.toBe(identity)
    expect(haplotypeRequestScope({ ...base, start: 101 })).not.toBe(identity)
    expect(haplotypeRequestScope({ ...base, datasetId: 'gnomad_r4_lr' as any })).not.toBe(identity)
    expect(haplotypeRequestScope({
      ...base,
      provenance: {
        ...base.provenance,
        sources: [{ ...base.provenance.sources[0], run_id: 'run-2' }],
      },
    })).not.toBe(identity)
  })
})

describe('LongReadUnifiedView methylation detail ownership', () => {
  test('paints both A/B copies for one-sided GT1 and GT2 carrier rows', async () => {
    const sampleIds = ['gt1-carrier', 'gt2-carrier']
    mockVisibleSampleIds = sampleIds
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = [
      {
        sample_id: 'gt1-carrier',
        strand_mapping: { strandA: 2, strandB: 1 },
        phase_set_mapping: { phaseSetA: null, phaseSetB: null },
      },
      {
        sample_id: 'gt2-carrier',
        strand_mapping: { strandA: 1, strandB: 2 },
        phase_set_mapping: { phaseSetA: null, phaseSetB: null },
      },
    ]
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const request = requestsNamed('RegionJoinedPhasedMethylation')[0]
    const records = [
      joinedRecordForStrand('gt1-carrier', 1, 10),
      joinedRecordForStrand('gt1-carrier', 2, 20),
      joinedRecordForStrand('gt2-carrier', 1, 30),
      joinedRecordForStrand('gt2-carrier', 2, 40),
    ]
    await resolveRequest(request, {
      data: {
        joined_phased_methylation_region: joinedRegion(sampleIds, sampleIds, [], records),
      },
    })

    await waitFor(() => {
      const props = mockHaplotypeTrackProps.at(-1)
      const result = perCopyMethylationForReadyRow(
        props.perCopyMethylationRecords,
        workerDataOverride!.groups[0].samples,
        props.perCopyMethylationSampleStates
      )
      expect(result.readiness).toBe('ready')
      expect(result.points.A).toEqual([
        expect.objectContaining({ sampleCount: 2, vcfStrands: [1, 2] }),
      ])
      expect(result.points.B).toEqual([
        expect.objectContaining({ sampleCount: 2, vcfStrands: [1, 2] }),
      ])
    })
  })

  test('retries only failed visible samples while preserving completed records and bulk intent', async () => {
    const sampleIds = Array.from(
      { length: 27 },
      (_, index) => `carrier-${String(index).padStart(2, '0')}`
    )
    mockVisibleSampleIds = sampleIds
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = sampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    expect(await screen.findByText('Loading methylation 0/27 visible samples…')).not.toBeNull()
    const first = requestsNamed('RegionJoinedPhasedMethylation')[0]
    expect(first.variables.sample_ids).toHaveLength(25)
    const firstRecords = first.variables.sample_ids.map((sampleId: string) =>
      joinedRecord(sampleId, 0)
    )
    await resolveRequest(first, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          first.variables.sample_ids,
          first.variables.sample_ids,
          [],
          firstRecords
        ),
      },
    })

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const second = requestsNamed('RegionJoinedPhasedMethylation')[1]
    expect(second.variables.sample_ids).toHaveLength(2)
    expect(await screen.findByText('Loading methylation 25/27 visible samples…')).not.toBeNull()
    let props = mockHaplotypeTrackProps.at(-1)
    expect(
      perCopyMethylationForReadyRow(
        props.perCopyMethylationRecords,
        workerDataOverride.groups[0].samples,
        props.perCopyMethylationSampleStates
      )
    ).toEqual({ readiness: 'loading', points: { A: [], B: [] } })

    await resolveRequest(second, {
      data: { joined_phased_methylation_region: null },
      errors: [{ message: 'batch two failed', extensions: { code: 'FAILED_BATCH' } }],
    })
    await waitFor(() => {
      props = mockHaplotypeTrackProps.at(-1)
      expect(props.perCopyMethylationSampleStates.get(second.variables.sample_ids[0])).toEqual({
        status: 'error',
        code: 'FAILED_BATCH',
        reason: 'batch two failed',
      })
    })
    expect(
      perCopyMethylationForReadyRow(
        props.perCopyMethylationRecords,
        workerDataOverride.groups[0].samples,
        props.perCopyMethylationSampleStates
      )
    ).toEqual({ readiness: 'error', points: { A: [], B: [] } })
    expect(
      await screen.findByText('Methylation loading error for visible samples (FAILED_BATCH)')
    ).not.toBeNull()

    const loadAll = screen.getByRole('button', { name: 'Load all methylation samples' })
    expect((loadAll as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry methylation' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    const retry = requestsNamed('RegionJoinedPhasedMethylation')[2]
    expect(retry.variables.sample_ids).toEqual(second.variables.sample_ids)
    props = mockHaplotypeTrackProps.at(-1)
    expect(props.perCopyMethylationRecords).toHaveLength(25)
    expect(props.perCopyMethylationSampleStates.get(first.variables.sample_ids[0])).toEqual({
      status: 'complete',
      recordCount: 1,
    })

    await resolveRequest(retry, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          retry.variables.sample_ids,
          [retry.variables.sample_ids[0]],
          [{
            sample_id: retry.variables.sample_ids[1],
            status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
            reason: 'No source output',
          }],
          [joinedRecord(retry.variables.sample_ids[0], 0)]
        ),
      },
    })
    await waitFor(() => {
      props = mockHaplotypeTrackProps.at(-1)
      expect(props.perCopyMethylationRecords).toHaveLength(26)
      expect(
        perCopyMethylationForReadyRow(
          props.perCopyMethylationRecords,
          workerDataOverride!.groups[0].samples,
          props.perCopyMethylationSampleStates
        ).readiness
      ).toBe('ready')
    })
    expect(mockLegendProps.at(-1).allMethylationProgress).toBeNull()
    expect((screen.getByRole('button', { name: 'Load all methylation samples' }) as HTMLButtonElement).disabled).toBe(false)
  })

  test('retries only failed Load All samples and preserves terminal samples', async () => {
    const allSampleIds = mockSourceSampleIds.slice(0, 26)
    const visibleSampleId = allSampleIds[25]
    mockVisibleSampleIds = [visibleSampleId]
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = allSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    await resolveRequest(requestsNamed('RegionJoinedPhasedMethylation')[0], {
      data: {
        joined_phased_methylation_region: joinedRegion(
          [visibleSampleId],
          [visibleSampleId],
          [],
          [joinedRecord(visibleSampleId, 0)]
        ),
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Load all methylation samples' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const failedBulk = requestsNamed('RegionJoinedPhasedMethylation')[1]
    expect(failedBulk.variables.sample_ids).toHaveLength(25)
    await resolveRequest(failedBulk, {
      data: { joined_phased_methylation_region: null },
      errors: [{ message: 'bulk failed', extensions: { code: 'BULK_FAILURE' } }],
    })

    await waitFor(() => {
      expect(mockLegendProps.at(-1).allMethylationProgress).toMatchObject({
        status: 'error',
        errorCodes: ['BULK_FAILURE'],
      })
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Retry methylation' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    const retry = requestsNamed('RegionJoinedPhasedMethylation')[2]
    expect(retry.variables.sample_ids).toEqual(failedBulk.variables.sample_ids)
    let props = mockHaplotypeTrackProps.at(-1)
    expect(props.perCopyMethylationSampleStates.get(visibleSampleId)).toEqual({
      status: 'complete',
      recordCount: 1,
    })
    expect(props.perCopyMethylationRecords).toEqual([joinedRecord(visibleSampleId, 0)])

    await resolveRequest(retry, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          retry.variables.sample_ids,
          retry.variables.sample_ids,
          [],
          []
        ),
      },
    })
    await waitFor(() => {
      props = mockHaplotypeTrackProps.at(-1)
      expect(props.perCopyMethylationSampleStates.get(visibleSampleId)).toEqual({
        status: 'complete',
        recordCount: 1,
      })
      expect(mockLegendProps.at(-1).allMethylationProgress).toMatchObject({
        status: 'loaded',
        terminalCount: 26,
        totalCount: 26,
      })
    })
  })

  test('aggregates a 27-sample row only when all batches are complete or unavailable', async () => {
    const sampleIds = Array.from(
      { length: 27 },
      (_, index) => `carrier-${String(index).padStart(2, '0')}`
    )
    mockVisibleSampleIds = sampleIds
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = sampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const first = requestsNamed('RegionJoinedPhasedMethylation')[0]
    await resolveRequest(first, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          first.variables.sample_ids,
          first.variables.sample_ids,
          [],
          first.variables.sample_ids.map((sampleId: string) => joinedRecord(sampleId, 0))
        ),
      },
    })
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const second = requestsNamed('RegionJoinedPhasedMethylation')[1]
    const completed = [second.variables.sample_ids[0]]
    await resolveRequest(second, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          second.variables.sample_ids,
          completed,
          [
            {
              sample_id: second.variables.sample_ids[1],
              status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
              reason: 'No source output',
            },
          ],
          completed.map((sampleId) => joinedRecord(sampleId, 0))
        ),
      },
    })

    await waitFor(() => {
      const props = mockHaplotypeTrackProps.at(-1)
      const result = perCopyMethylationForReadyRow(
        props.perCopyMethylationRecords,
        workerDataOverride!.groups[0].samples,
        props.perCopyMethylationSampleStates
      )
      expect(result.readiness).toBe('ready')
      expect(result.points.A).toEqual([expect.objectContaining({ sampleCount: 26 })])
      expect(screen.getByText('Loaded 27 visible samples')).not.toBeNull()
    })
  })

  test('replaces visible demand and does not refetch old rows after a region scope change', async () => {
    mockVisibleSampleIds = ['carrier-a']
    mockJoinedCapability = confirmedCapability()
    const rendered = renderView()
    await enablePerCopyMethylation()
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const first = requestsNamed('RegionJoinedPhasedMethylation')[0]
    expect(first.variables.sample_ids).toEqual(['carrier-a'])

    await act(async () => {
      mockHaplotypeTrackProps.at(-1).onVisibleDiploidSampleIdsChange(['carrier-b'])
      await Promise.resolve()
    })
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const second = requestsNamed('RegionJoinedPhasedMethylation')[1]
    expect(second.variables.sample_ids).toEqual(['carrier-b'])
    expect(first.signal?.aborted).toBe(true)
    await resolveRequest(second, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          ['carrier-b'],
          ['carrier-b'],
          [],
          [joinedRecord('carrier-b', 0)]
        ),
      },
    })

    mockVisibleSampleIds = ['carrier-b']
    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr22', start: 300, stop: 400 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    expect(requestsNamed('RegionJoinedPhasedMethylation')[2].variables).toEqual(
      expect.objectContaining({ start: 300, stop: 400, sample_ids: ['carrier-b'] })
    )
    expect(
      requestsNamed('RegionJoinedPhasedMethylation')
        .slice(1)
        .some((request) => request.variables.sample_ids.includes('carrier-a'))
    ).toBe(false)
  })

  test.each([
    ['GraphQL schema error', 'graphql'],
    ['network rejection', 'network'],
  ] as const)('fails closed when the capability query has a %s', async (_label, failure) => {
    mockJoinedCapabilityFailure = failure
    renderView()

    const control = await screen.findByLabelText('Per-copy methylation')
    expect(
      await screen.findByText(
        'Per-copy methylation API is unavailable; restart with the joined methylation route enabled.'
      )
    ).not.toBeNull()
    expect((control as HTMLInputElement).disabled).toBe(true)
    expect((control as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByText('Per-copy methylation capability is loading')).toBeNull()
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)
  })

  test('ignores a stale capability failure after the region changes', async () => {
    mockDeferJoinedCapability = true
    const rendered = renderView()
    await waitFor(() => {
      expect(requestsNamed('RegionJoinedPhasedMethylationCapability')).toHaveLength(1)
    })
    const staleRequest = requestsNamed('RegionJoinedPhasedMethylationCapability')[0]

    mockDeferJoinedCapability = false
    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr21', start: 300, stop: 400 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('No admitted joined route')).not.toBeNull()
    await rejectRequest(staleRequest, new Error('stale API connection refused'))
    expect(screen.queryByText(/Per-copy methylation API is unavailable/)).toBeNull()
    expect(screen.getByText('No admitted joined route')).not.toBeNull()
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)
  })

  test('shows unavailable reasons and never fetches over-span or malformed capabilities', async () => {
    mockJoinedCapability = confirmedCapability({ max_span_bp: 50 })
    const overSpan = renderView()
    const control = await screen.findByLabelText('Per-copy methylation')
    expect((control as HTMLInputElement).disabled).toBe(true)
    expect(await screen.findByText(/region spans 101 bp; maximum is 50 bp/)).not.toBeNull()
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)
    overSpan.unmount()

    mockJoinedCapability = confirmedCapability({ identity: null })
    renderView()
    const malformed = await screen.findByLabelText('Per-copy methylation')
    expect((malformed as HTMLInputElement).disabled).toBe(true)
    expect(await screen.findByText(/capability identity is not admitted/)).not.toBeNull()
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)
  })

  test('defaults confirmed joined methylation off and fetches visible rows only after opt-in', async () => {
    const identity = {
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
    mockJoinedCapability = confirmedCapability({ identity })
    renderView(
      { chrom: 'chr22', start: 100, stop: 200 },
      '/?show_haplotypes=true&show_source_phased_methylation=true&source_phased_methylation_sample=NOT_REAL'
    )

    const control = await screen.findByLabelText('Per-copy methylation')
    await waitFor(() => expect((control as HTMLInputElement).disabled).toBe(false))
    expect((control as HTMLInputElement).checked).toBe(false)
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)

    fireEvent.click(control)
    await waitFor(() => expect((control as HTMLInputElement).checked).toBe(true))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const request = requestsNamed('RegionJoinedPhasedMethylation')[0]
    expect(request.variables.sample_ids).toEqual(mockCarrierSampleIds)
    expect(request.variables.sample_ids.length).toBeLessThanOrEqual(25)
    expect(request.variables.expected_orientation_receipt_sha256).toBe('orientation-sha')

    await resolveRequest(request, {
      data: {
        joined_phased_methylation_region: {
          identity,
          requested_sample_ids: mockCarrierSampleIds,
          completed_sample_ids: mockCarrierSampleIds.slice(0, 5),
          unavailable_samples: [
            {
              sample_id: 'carrier-f',
              status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
              reason: 'No phased methylation source output',
            },
          ],
          records: [
            {
              source_row_key: 'row-a-1',
              chr: 'chr22',
              pos1: 110,
              pos2: 111,
              sample: 'carrier-a',
              methylation: 25,
              coverage: 4,
              source_haplotype: 'HAP1',
              vcf_strand: 1,
              mapping_scope: 'CHROMOSOME_WIDE',
              phase_set: null,
            },
          ],
        },
      },
    })

    await waitFor(() => {
      const props = mockHaplotypeTrackProps.at(-1)
      expect(props.perCopyMethylationRecords).toHaveLength(1)
      expect(props.perCopyMethylationSampleStates.get('carrier-b')).toEqual({
        status: 'complete',
        recordCount: 0,
      })
      expect(props.perCopyMethylationSampleStates.get('carrier-f')).toEqual({
        status: 'unavailable',
        reason: 'No phased methylation source output',
      })
      expect(props.methylationData).toEqual([])
    })
    expect(screen.queryByText(/Show source-labelled hap1\/hap2/)).toBeNull()
    expect(requestsNamed('RegionSourcePhasedMethylation')).toHaveLength(0)
  })

  test('surfaces typed joined query errors without painting points', async () => {
    const identity = {
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
    mockJoinedCapability = confirmedCapability({ identity })
    renderView()
    const control = await screen.findByLabelText('Per-copy methylation')
    if (!(control as HTMLInputElement).checked) fireEvent.click(control)
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    await resolveRequest(requestsNamed('RegionJoinedPhasedMethylation')[0], {
      data: { joined_phased_methylation_region: null },
      errors: [
        {
          message: 'Joined result is too large',
          extensions: { code: 'JOINED_METHYLATION_RESULT_TOO_LARGE' },
        },
      ],
    })
    await waitFor(() => {
      const props = mockHaplotypeTrackProps.at(-1)
      expect(props.perCopyMethylationRecords).toEqual([])
      expect(props.perCopyMethylationSampleStates.get('carrier-a')).toEqual({
        status: 'error',
        code: 'JOINED_METHYLATION_RESULT_TOO_LARGE',
        reason: 'Joined result is too large',
      })
    })
  })

  test('fails closed for AoU and ignores retired URL params', async () => {
    mockJoinedCapability = {
      ...mockJoinedCapability,
      status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
      reason: 'AoU is summary-only',
    }
    renderView(
      { chrom: 'chr22', start: 100, stop: 200 },
      '/?show_haplotypes=true&show_source_phased_methylation=true&source_phased_methylation_sample=HG00097',
      'aou'
    )
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByLabelText('Per-copy methylation')).toBeNull()
    expect(mockLegendProps).toHaveLength(0)
    expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(0)
    expect(requestsNamed('RegionSourcePhasedMethylation')).toHaveLength(0)
  })

  test('keeps sample-total controls and automatic queries dormant', async () => {
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()
    expect(screen.queryByText('Methylation (sample total)')).toBeNull()
    expect(screen.queryByText('Outliers only')).toBeNull()
    expect(screen.queryByText('Load all sample totals')).toBeNull()
    expect(requestsNamed('RegionMethylationAvailability')).toHaveLength(0)
    expect(requestsNamed('RegionMethylationSummary')).toHaveLength(0)
    expect(requestsNamed('RegionMethylationOutliers')).toHaveLength(0)
    expect(requestsNamed('RegionMethylation')).toHaveLength(0)
  })

  test('filters diplotype samples from the capability roster and restores all groups', async () => {
    workerDataOverride = workerData()
    workerDataOverride.groups = [
      {
        ...workerDataOverride.groups[0],
        hash: 1,
        samples: [
          workerDataOverride.groups[0].samples[0],
          { ...workerDataOverride.groups[0].samples[1], sample_id: 'source-absent' },
        ],
      },
      {
        ...workerDataOverride.groups[0],
        hash: 2,
        samples: [{ ...workerDataOverride.groups[0].samples[2], sample_id: 'absent-only' }],
      },
    ]
    mockVisibleSampleIds = ['carrier-a', 'source-absent', 'absent-only']
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    const filter = await screen.findByLabelText('Methylation samples only')
    fireEvent.click(filter)
    await waitFor(() => {
      const groups = mockHaplotypeTrackProps.at(-1).haplotypeGroups
      expect(groups).toHaveLength(1)
      expect(groups[0].samples.map((sample: any) => sample.sample_id)).toEqual(['carrier-a'])
    })
    fireEvent.click(filter)
    await waitFor(() => {
      const groups = mockHaplotypeTrackProps.at(-1).haplotypeGroups
      expect(groups).toHaveLength(2)
      expect(groups.flatMap((group: any) => group.samples)).toHaveLength(3)
    })
  })

  test('does not resurrect Load All after the per-copy layer is turned off and on', async () => {
    const allSampleIds = mockSourceSampleIds.slice(0, 27)
    const visibleSampleId = allSampleIds[26]
    mockVisibleSampleIds = [visibleSampleId]
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = allSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const visible = requestsNamed('RegionJoinedPhasedMethylation')[0]
    await resolveRequest(visible, {
      data: {
        joined_phased_methylation_region: joinedRegion([visibleSampleId], [visibleSampleId]),
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Load all methylation samples' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const staleBulk = requestsNamed('RegionJoinedPhasedMethylation')[1]
    expect(staleBulk.variables.sample_ids).toHaveLength(25)

    const layer = screen.getByLabelText('Per-copy methylation')
    fireEvent.click(layer)
    await waitFor(() => expect(staleBulk.signal?.aborted).toBe(true))
    fireEvent.click(layer)
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    expect(requestsNamed('RegionJoinedPhasedMethylation')[2].variables.sample_ids).toEqual([
      visibleSampleId,
    ])
    expect(mockLegendProps.at(-1).allMethylationProgress).toBeNull()
  })

  test('does not resurrect Load All after leaving and returning to Diploid mode', async () => {
    const allSampleIds = mockSourceSampleIds.slice(0, 27)
    const visibleSampleId = allSampleIds[26]
    mockVisibleSampleIds = [visibleSampleId]
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = allSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    await resolveRequest(requestsNamed('RegionJoinedPhasedMethylation')[0], {
      data: {
        joined_phased_methylation_region: joinedRegion([visibleSampleId], [visibleSampleId]),
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Load all methylation samples' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const staleBulk = requestsNamed('RegionJoinedPhasedMethylation')[1]

    act(() => mockLegendProps.at(-1).onGroupingModeChange('similarity'))
    await waitFor(() => expect(mockLegendProps.at(-1).groupingMode).toBe('similarity'))
    expect(staleBulk.signal?.aborted).toBe(true)
    act(() => mockLegendProps.at(-1).onGroupingModeChange('diploid'))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    expect(requestsNamed('RegionJoinedPhasedMethylation')[2].variables.sample_ids).toEqual([
      visibleSampleId,
    ])
    expect(mockLegendProps.at(-1).allMethylationProgress).toBeNull()
  })

  test('does not resurrect Load All when an exact region scope is revisited', async () => {
    const allSampleIds = mockSourceSampleIds.slice(0, 27)
    const visibleSampleId = allSampleIds[26]
    mockVisibleSampleIds = [visibleSampleId]
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = allSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    const rendered = renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    await resolveRequest(requestsNamed('RegionJoinedPhasedMethylation')[0], {
      data: {
        joined_phased_methylation_region: joinedRegion([visibleSampleId], [visibleSampleId]),
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Load all methylation samples' }))
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const staleBulk = requestsNamed('RegionJoinedPhasedMethylation')[1]

    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr22', start: 300, stop: 400 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(
        requestsNamed('RegionJoinedPhasedMethylation')
          .slice(2)
          .some((request) => request.variables.start === 300)
      ).toBe(true)
    })
    expect(staleBulk.signal?.aborted).toBe(true)

    rendered.rerender(
      <MemoryRouter initialEntries={['/?show_haplotypes=true']}>
        <LongReadUnifiedView
          datasetId={'gnomad_r4' as any}
          gene={{ chrom: 'chr22', start: 100, stop: 200 }}
          variants={[]}
          lrCohort="hgsvc_hprc"
        />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(
        requestsNamed('RegionJoinedPhasedMethylation')
          .slice(2)
          .some((request) => request.variables.start === 100)
      ).toBe(true)
    })
    expect(
      requestsNamed('RegionJoinedPhasedMethylation')
        .slice(2)
        .every((request) =>
          request.variables.sample_ids.length === 1 &&
          request.variables.sample_ids[0] === visibleSampleId
        )
    ).toBe(true)
    expect(mockLegendProps.at(-1).allMethylationProgress).toBeNull()
  })

  test('fetches all admitted display samples in batches while retaining visible-row priority', async () => {
    const allSampleIds = mockSourceSampleIds.slice(0, 27)
    mockVisibleSampleIds = [allSampleIds[26]]
    workerDataOverride = workerData()
    workerDataOverride.groups[0].samples = allSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
    }))
    mockJoinedCapability = confirmedCapability()
    renderView()
    await enablePerCopyMethylation()

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(1))
    const visibleRequest = requestsNamed('RegionJoinedPhasedMethylation')[0]
    expect(visibleRequest.variables.sample_ids).toEqual([allSampleIds[26]])
    await resolveRequest(visibleRequest, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          visibleRequest.variables.sample_ids,
          visibleRequest.variables.sample_ids,
          [],
          []
        ),
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Load all methylation samples' }))

    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(2))
    const firstAllBatch = requestsNamed('RegionJoinedPhasedMethylation')[1]
    expect(firstAllBatch.variables.sample_ids).toHaveLength(25)
    await resolveRequest(firstAllBatch, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          firstAllBatch.variables.sample_ids,
          firstAllBatch.variables.sample_ids,
          [],
          []
        ),
      },
    })
    await waitFor(() => expect(requestsNamed('RegionJoinedPhasedMethylation')).toHaveLength(3))
    const secondAllBatch = requestsNamed('RegionJoinedPhasedMethylation')[2]
    expect(secondAllBatch.variables.sample_ids).toHaveLength(1)
    await resolveRequest(secondAllBatch, {
      data: {
        joined_phased_methylation_region: joinedRegion(
          secondAllBatch.variables.sample_ids,
          secondAllBatch.variables.sample_ids,
          [],
          []
        ),
      },
    })
    await waitFor(() => {
      expect(mockLegendProps.at(-1).allMethylationProgress).toMatchObject({
        status: 'loaded',
        terminalCount: 27,
        totalCount: 27,
      })
    })
  })
})
