import React from 'react'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render } from '@testing-library/react'

import { BaseQuery } from './Query'

const originalFetch = global.fetch
const fetchMock = jest.fn(() => new Promise<Response>(() => {}))

const renderBaseQuery = (url: string) =>
  render(
    <BaseQuery operationName="TestQuery" query="query TestQuery { meta { datasets } }" url={url}>
      {() => <div />}
    </BaseQuery>
  )

beforeEach(() => {
  fetchMock.mockClear()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('BaseQuery request headers', () => {
  it.each(['/api', '/api/'])('marks requests to %s as browser requests', (url) => {
    renderBaseQuery(url)

    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-GnomAD-Client': 'browser',
        },
      })
    )
  })

  it('does not mark requests to other services as gnomAD API browser requests', () => {
    renderBaseQuery('/reads/')

    expect(fetchMock).toHaveBeenCalledWith(
      '/reads/',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
  })
})
