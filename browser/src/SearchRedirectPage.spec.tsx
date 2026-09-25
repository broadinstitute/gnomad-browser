import React from 'react'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, render, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'

import SearchRedirectPage from './SearchRedirectPage'

const originalLrMode = process.env.LR_Y1_ENABLED

afterEach(() => {
  if (originalLrMode === undefined) delete process.env.LR_Y1_ENABLED
  else process.env.LR_Y1_ENABLED = originalLrMode
})

describe('SearchRedirectPage', () => {
  it.each(['true', 'false'])(
    'uses deployment default for direct searches without a dataset (LR=%s)',
    async (mode) => {
      process.env.LR_Y1_ENABLED = mode
      const history = createMemoryHistory({
        initialEntries: ['/awesome?query=6-31400000-31450000'],
      })
      render(
        <Router history={history}>
          <SearchRedirectPage query="6-31400000-31450000" />
        </Router>
      )
      await waitFor(() => {
        expect(`${history.location.pathname}${history.location.search}`).toBe(
          `/region/6-31400000-31450000?dataset=${mode === 'true' ? 'gnomad_r4_lr' : 'gnomad_r4'}`
        )
      })
    }
  )

  beforeEach(() => {
    // @ts-expect-error Test fetch mock.
    global.fetch = jest.fn()
  })

  it('preserves LR dataset and cohort in direct gene search redirects', async () => {
    // @ts-expect-error Test fetch mock.
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: {
            gene_search: [{ ensembl_id: 'ENSG00000133424', symbol: 'LARGE1' }],
          },
        }),
    })
    const history = createMemoryHistory({ initialEntries: ['/awesome?query=LARGE1'] })

    await act(async () => {
      render(
        <Router history={history}>
          <SearchRedirectPage query="LARGE1" datasetId="gnomad_r4_lr" lrCohort="aou" />
        </Router>
      )
    })

    await waitFor(() => {
      expect(`${history.location.pathname}${history.location.search}`).toBe(
        '/gene/ENSG00000133424?dataset=gnomad_r4_lr&lr_cohort=aou'
      )
    })
  })
})
