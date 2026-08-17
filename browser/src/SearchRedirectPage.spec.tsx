import React from 'react'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, render, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'

import SearchRedirectPage from './SearchRedirectPage'

describe('SearchRedirectPage', () => {
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
