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
const mockHaplotypeTrackProps: any[] = []
let mockPhasedCapability: any = null

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
  return {
    __esModule: true,
    default: HaplotypeTrack,
    Legend: () => null,
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
jest.mock('./LongReadViewControls', () => () => null)
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
import LongReadUnifiedView from './LongReadUnifiedView'

type DeferredGraphQLRequest = {
  name: string
  variables: any
  signal?: AbortSignal
  resolve: (response: any) => void
}

const mockGraphQLRequests: DeferredGraphQLRequest[] = []

const responseWithJson = (payload: any) => ({
  text: async () => JSON.stringify(payload),
})

const workerData = () => ({
  groups: [{
    is_diplotype: true,
    samples: mockCarrierSampleIds.map((sampleId) => ({
      sample_id: sampleId,
      strand_mapping: { strandA: null, strandB: null },
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

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null

  onerror: (() => void) | null = null

  postMessage(message: any) {
    if (message.type === 'INIT') {
      this.onmessage?.({
        data: { type: 'READY', data: JSON.parse(JSON.stringify(workerData())) },
      } as MessageEvent)
    } else if (message.type === 'UPDATE_AF') {
      this.onmessage?.({
        data: { type: 'UPDATED', data: JSON.parse(JSON.stringify(workerData())) },
      } as MessageEvent)
    }
  }

  terminate() { this.onmessage = null }
}

const requestsNamed = (name: string) => mockGraphQLRequests.filter((request) => request.name === name)
const detailRequests = () => requestsNamed('RegionMethylation')

const resolveRequest = async (request: DeferredGraphQLRequest, payload: any) => {
  await act(async () => {
    request.resolve(responseWithJson(payload))
    await Promise.resolve()
    await Promise.resolve()
  })
}

const renderView = (
  gene = { chrom: 'chr22', start: 100, stop: 200 },
  initialEntry = '/?show_haplotypes=true'
) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <LongReadUnifiedView
      datasetId={'gnomad_r4' as any}
      gene={gene}
      variants={[]}
    />
  </MemoryRouter>
)

const resolveSummaryAndOutlier = async () => {
  await waitFor(() => {
    expect(requestsNamed('RegionMethylationSummary')).toHaveLength(1)
    expect(requestsNamed('RegionMethylationOutliers')).toHaveLength(1)
  })
  await resolveRequest(requestsNamed('RegionMethylationSummary')[0], {
    data: { methylation_summary: [] },
  })
  await resolveRequest(requestsNamed('RegionMethylationOutliers')[0], {
    data: {
      methylation_outliers: {
        total_cpg_sites: 1,
        total_samples: 2,
        samples: [
          {
            sample_id: 'carrier-a',
            outlier_count: 2,
            outlier_fraction: 1,
            direction: 'high',
          },
          {
            sample_id: 'non-carrier-outlier',
            outlier_count: 1,
            outlier_fraction: 1,
            direction: 'high',
          },
        ],
      },
    },
  })
}

beforeEach(() => {
  mockGraphQLRequests.length = 0
  mockHaplotypeTrackProps.length = 0
  mockPhasedCapability = null
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: MockWorker,
  })
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'time').mockImplementation(() => {})
  jest.spyOn(console, 'timeEnd').mockImplementation(() => {})

  const fetchMock = jest.fn((input: any, init?: any) => {
    if (String(input).startsWith('/api/lr/haplotype-groups')) {
      return Promise.resolve(responseWithJson({
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
      }) as any)
    }

    const body = JSON.parse(init?.body || '{}')
    const name = body.query?.match(/query\s+(\w+)/)?.[1] || 'unknown'
    if (name === 'RegionSampleMetadata') {
      return Promise.resolve(responseWithJson({ data: { sample_metadata: [] } }) as any)
    }
    if (name === 'RegionPhasedMethylationCapability') {
      return Promise.resolve(responseWithJson({
        data: mockPhasedCapability
          ? { phased_methylation_capability: mockPhasedCapability }
          : {},
      }) as any)
    }

    return new Promise((resolve) => {
      mockGraphQLRequests.push({
        name,
        variables: body.variables,
        signal: init?.signal,
        resolve,
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

describe('LongReadUnifiedView methylation detail ownership', () => {
  test('offers and renders both unjoined source-phased tracks while retaining haplotype rows', async () => {
    mockPhasedCapability = {
      data_layer: 'SOURCE_PHASED', available: true, joinable_to_vcf: false,
      status: 'AVAILABLE_ORIENTATION_UNCONFIRMED', orientation_status: 'UNCONFIRMED',
      reason: 'visual evaluation only',
    }
    renderView({ chrom: 'chr22', start: 47_040_000, stop: 47_050_000 })
    const control = await screen.findByLabelText('Show source hap1/hap2 (orientation unconfirmed)')
    expect((control as HTMLInputElement).disabled).toBe(false)
    fireEvent.click(control)
    await waitFor(() => expect(requestsNamed('RegionSourcePhasedMethylation')).toHaveLength(1))
    await resolveRequest(requestsNamed('RegionSourcePhasedMethylation')[0], {
      data: { source_phased_methylation: [
        {
          chr: 'chr22', pos1: 47040001, pos2: 47040002, methylation: 25,
          sample: 'HG00097', coverage: 4, data_layer: 'SOURCE_PHASED',
          source_haplotype: 'HAP1', vcf_strand: null, phase_set: null,
        },
        {
          chr: 'chr22', pos1: 47040003, pos2: 47040004, methylation: 75,
          sample: 'HG00097', coverage: 8, data_layer: 'SOURCE_PHASED',
          source_haplotype: 'HAP2', vcf_strand: null, phase_set: null,
        },
      ] },
    })
    expect(await screen.findByText('HG00097 source hap1')).toBeTruthy()
    expect(screen.getByText('HG00097 source hap2')).toBeTruthy()
    expect(screen.getByTestId('haplotype-rows')).toBeTruthy()
  })

  test('auto-detail cannot clear load-all progress or enable a premature second click', async () => {
    renderView()
    await screen.findByTestId('load-all')
    await resolveSummaryAndOutlier()

    await waitFor(() => expect(detailRequests()).toHaveLength(1))
    const autoRequest = detailRequests()[0]
    expect(autoRequest.variables.samples).toEqual(['carrier-a', 'non-carrier-outlier'])

    await act(async () => {
      mockHaplotypeTrackProps.at(-1).onLoadAllSamples()
      await Promise.resolve()
    })
    await waitFor(() => expect(detailRequests()).toHaveLength(2))
    const firstLoadAllRequest = detailRequests()[1]
    expect(autoRequest.signal?.aborted).toBe(true)
    expect(firstLoadAllRequest.variables.samples).toEqual(mockCarrierSampleIds.slice(0, 5))
    expect(screen.getByTestId('detail-status').textContent).toBe('true:0/6')

    // The cancelled auto request resolves after load-all owns progress. Its stale
    // finally must not clear load-all's loading state or use the non-carrier in
    // the captured six-carrier roster.
    await resolveRequest(autoRequest, { data: { methylation: [] } })
    expect(screen.getByTestId('detail-status').textContent).toBe('true:0/6')

    expect((screen.getByTestId('load-all') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('load-all'))
    expect(detailRequests()).toHaveLength(2)

    await resolveRequest(firstLoadAllRequest, { data: { methylation: [] } })
    await waitFor(() => expect(detailRequests()).toHaveLength(3))
    expect(detailRequests()[2].variables.samples).toEqual(['carrier-f'])
    expect(screen.getByTestId('detail-status').textContent).toBe('true:5/6')

    await resolveRequest(detailRequests()[2], { data: { methylation: [] } })
    await waitFor(() => {
      expect(screen.getByTestId('detail-status').textContent).toBe('false:6/6')
    })
    expect(detailRequests()).toHaveLength(3)

    // A later click sees the completed captured roster and issues no duplicate.
    fireEvent.click(screen.getByTestId('load-all'))
    expect(detailRequests()).toHaveLength(3)
    expect(mockHaplotypeTrackProps.every((props) => (
      props.methylationSampleCount <= props.methylationTotalSamples
    ))).toBe(true)
  })

  test('load-all retains ownership when a non-carrier outlier arrives, including after completion', async () => {
    renderView()
    await screen.findByTestId('load-all')

    fireEvent.click(screen.getByTestId('load-all'))
    await waitFor(() => expect(detailRequests()).toHaveLength(1))
    const firstLoadAllRequest = detailRequests()[0]
    expect(firstLoadAllRequest.variables.samples).toEqual(mockCarrierSampleIds.slice(0, 5))

    await resolveSummaryAndOutlier()
    await act(async () => { await Promise.resolve() })
    expect(detailRequests()).toHaveLength(1)
    expect(screen.getByTestId('detail-status').textContent).toBe('true:0/6')

    await resolveRequest(firstLoadAllRequest, { data: { methylation: [] } })
    await waitFor(() => expect(detailRequests()).toHaveLength(2))
    expect(detailRequests()[1].variables.samples).toEqual(['carrier-f'])
    await resolveRequest(detailRequests()[1], { data: { methylation: [] } })

    await waitFor(() => {
      expect(screen.getByTestId('detail-status').textContent).toBe('false:6/6')
    })
    expect(detailRequests()).toHaveLength(2)
    expect(mockHaplotypeTrackProps.some((props) => (
      props.methylationLoading === false &&
      props.methylationSampleCount === 6 &&
      props.methylationTotalSamples === 6
    ))).toBe(true)

    fireEvent.click(screen.getByTestId('load-all'))
    expect(detailRequests()).toHaveLength(2)
  })
})
