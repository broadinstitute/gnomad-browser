import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import LRCoverageTrack from './LRCoverageTrack'

jest.mock('../CoverageTrack', () => {
  const CoverageTrackMock = ({ coverageOverThresholds, datasets, metric }: any) => (
    <div
      data-coverage-over-thresholds={coverageOverThresholds.join(',')}
      data-metric={metric}
    >
      {datasets[0].name}
    </div>
  )
  ;(CoverageTrackMock as any).MetricOptions = {
    median: 'median',
    over_5: 'over_5',
    over_20: 'over_20',
  }
  return CoverageTrackMock
})

const response = {
  data: {
    lr_coverage: [{ pos: 1, mean: 1, median: 1 }],
  },
}

describe('LRCoverageTrack cohort routing', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as any).fetch
  })

  test.each([
    ['hgsvc_hprc', 'Long-read coverage — HGSVC/HPRC'],
    ['aou', 'Long-read coverage — All of Us'],
  ] as const)(
    '%s coverage defaults to median while retaining threshold metric options',
    async (lrCohort, label) => {
      const fetchMock = jest.fn().mockResolvedValue({ json: async () => response })
      ;(global as any).fetch = fetchMock

      render(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort={lrCohort} />)

      const coverageTrack = await screen.findByText(label)
      expect(coverageTrack.getAttribute('data-metric')).toBe('median')
      expect(coverageTrack.getAttribute('data-coverage-over-thresholds')).toBe(
        '1,5,10,15,20,25,30,50,100'
      )
    }
  )

  test('HGSVC -> AoU -> HGSVC switching keeps median selected and routes each request', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ json: async () => response })
    ;(global as any).fetch = fetchMock

    const { rerender } = render(
      <LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="hgsvc_hprc" />
    )
    expect(
      (await screen.findByText('Long-read coverage — HGSVC/HPRC')).getAttribute('data-metric')
    ).toBe('median')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables.lrCohort).toBe('hgsvc_hprc')

    rerender(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="aou" />)
    expect(
      (await screen.findByText('Long-read coverage — All of Us')).getAttribute('data-metric')
    ).toBe('median')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).variables.lrCohort).toBe('aou')

    rerender(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="hgsvc_hprc" />)
    expect(
      (await screen.findByText('Long-read coverage — HGSVC/HPRC')).getAttribute('data-metric')
    ).toBe('median')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).variables.lrCohort).toBe('hgsvc_hprc')
  })

  test('requests coverage for regions over 1 Mb without changing the requested bounds', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ json: async () => response })
    ;(global as any).fetch = fetchMock

    render(
      <LRCoverageTrack chrom="22" start={1} stop={1_000_002} lrCohort="hgsvc_hprc" />
    )
    await screen.findByText('Long-read coverage — HGSVC/HPRC')

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables).toEqual({
      chrom: '22',
      start: 1,
      stop: 1_000_002,
      lrCohort: 'hgsvc_hprc',
    })
  })

  test('reports GraphQL retrieval errors instead of treating them as empty coverage', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: 'ClickHouse timeout' }], data: null }),
    })
    ;(global as any).fetch = fetchMock
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<LRCoverageTrack chrom="22" start={1} stop={1_000_002} lrCohort="hgsvc_hprc" />)

    expect((await screen.findByRole('status')).textContent).toBe('Unable to load LR coverage')
    expect(screen.queryByText('No long-read coverage is available for this region.')).toBeNull()
  })

  test('retains the coverage slot without announcing prior-cohort data while the next request is delayed', async () => {
    let resolveAoU!: (value: any) => void
    const delayedAoU = new Promise((resolve) => {
      resolveAoU = resolve
    })
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => response })
      .mockImplementationOnce(() => delayedAoU)
    ;(global as any).fetch = fetchMock

    const { rerender } = render(
      <LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="hgsvc_hprc" />
    )
    await screen.findByText('Long-read coverage — HGSVC/HPRC')
    const slot = screen.getByTestId('lr-coverage-slot')

    rerender(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="aou" />)

    expect(slot.isConnected).toBe(true)
    expect(slot.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('Long-read coverage — HGSVC/HPRC')).toBeNull()
    expect(screen.getByText('Long-read coverage — All of Us')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(
      'Updating long-read coverage for All of Us…'
    )

    resolveAoU({ json: async () => response })
    await waitFor(() => expect(slot.getAttribute('aria-busy')).toBe('false'))
  })
})
