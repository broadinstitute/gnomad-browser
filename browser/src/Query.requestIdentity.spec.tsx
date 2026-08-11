import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'

import Query, { BaseQuery } from './Query'

type DeferredResponse = {
  resolve: (value: any) => void
  promise: Promise<any>
}

const deferredResponse = (): DeferredResponse => {
  let resolve!: (value: any) => void
  const promise = new Promise<any>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

const response = (value: string) => ({ json: async () => ({ data: { value } }) })

const QueryState = (props: {
  operationName: string
  requestKey?: string
  variables: { cohort: string }
}) => (
  <BaseQuery
    operationName={props.operationName}
    query="query RequestIdentity($cohort: String!) { value(cohort: $cohort) }"
    requestKey={props.requestKey}
    url="/api/"
    variables={props.variables}
  >
    {({ data, loading }: any) => (
      <div>
        <span data-testid="loading">{String(loading)}</span>
        <span data-testid="value">{data?.value || 'none'}</span>
      </div>
    )}
  </BaseQuery>
)

describe('BaseQuery request identity', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as any).fetch
  })

  test('changed variables enter loading before children can render old data as current', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    ;(global as any).fetch = fetchMock

    const { rerender } = render(
      <QueryState operationName="FirstOperation" variables={{ cohort: 'hgsvc_hprc' }} />
    )
    await act(async () => first.resolve(response('HGSVC')))
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('HGSVC'))

    rerender(<QueryState operationName="FirstOperation" variables={{ cohort: 'aou' }} />)

    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1].body))
    expect(secondBody.variables).toEqual({ cohort: 'aou' })

    await act(async () => second.resolve(response('AoU')))
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('AoU'))
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  test('retained data keeps its loaded request identity and is explicitly stale', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    ;(global as any).fetch = jest
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const RetainingQuery = ({ cohort }: { cohort: string }) => (
      <Query
        operationName="RetainingQuery"
        query="query RetainingQuery($cohort: String!) { value(cohort: $cohort) }"
        variables={{ cohort }}
        retainPreviousData
      >
        {({ data, requestVariables, stale }: any) => (
          <output data-testid="retained">
            {`${data.value}:${requestVariables.cohort}:${String(stale)}`}
          </output>
        )}
      </Query>
    )

    const { rerender } = render(<RetainingQuery cohort="hgsvc_hprc" />)
    await act(async () => first.resolve(response('HGSVC')))
    await waitFor(() =>
      expect(screen.getByTestId('retained').textContent).toBe('HGSVC:hgsvc_hprc:false')
    )

    rerender(<RetainingQuery cohort="aou" />)
    expect(screen.getByTestId('retained').textContent).toBe('HGSVC:hgsvc_hprc:true')

    await act(async () => second.resolve(response('AoU')))
    await waitFor(() => expect(screen.getByTestId('retained').textContent).toBe('AoU:aou:false'))
  })

  test('operation name and explicit request key each start one new request', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response('ready'))
    ;(global as any).fetch = fetchMock

    const { rerender } = render(
      <QueryState
        operationName="FirstOperation"
        requestKey="gnomad_r4_lr"
        variables={{ cohort: 'hgsvc_hprc' }}
      />
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(
      <QueryState
        operationName="SecondOperation"
        requestKey="gnomad_r4_lr"
        variables={{ cohort: 'hgsvc_hprc' }}
      />
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    rerender(
      <QueryState
        operationName="SecondOperation"
        requestKey="gnomad_r4"
        variables={{ cohort: 'hgsvc_hprc' }}
      />
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })
})
