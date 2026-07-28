import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import LRCoverageTrack from './LRCoverageTrack'

jest.mock('../CoverageTrack', () => () => <div>coverage rendered</div>)

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

  test('HGSVC -> AoU -> HGSVC clears coverage and never queries while AoU is selected', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ json: async () => response })
    ;(global as any).fetch = fetchMock

    const { rerender } = render(
      <LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="hgsvc_hprc" />
    )
    await screen.findByText('coverage rendered')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables.lrCohort).toBe('hgsvc_hprc')

    rerender(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="aou" />)
    expect(screen.queryByText('coverage rendered')).toBeNull()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(<LRCoverageTrack chrom="22" start={1} stop={100} lrCohort="hgsvc_hprc" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).variables.lrCohort).toBe('hgsvc_hprc')
  })
})
