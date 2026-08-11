import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'

import Query, { BaseQuery } from './Query'
import RequestRevalidationFrame from './RequestRevalidationFrame'

type DeferredResponse = {
  reject: (error: Error) => void
  resolve: (value: any) => void
  promise: Promise<any>
}

const deferredResponse = (): DeferredResponse => {
  let reject!: (error: Error) => void
  let resolve!: (value: any) => void
  const promise = new Promise<any>((next, fail) => {
    resolve = next
    reject = fail
  })
  return { promise, reject, resolve }
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

const RetainedScopeQuery = ({ cohort, dataset }: { cohort: string; dataset: string }) => (
  <Query
    operationName="RetainedScope"
    query="query RetainedScope($cohort: String!) { value(cohort: $cohort) }"
    requestKey={dataset}
    variables={{ cohort }}
    retainPreviousData
    errorMessage={`Unable to load ${dataset}:${cohort}`}
    success={(data: any) => Boolean(data.value)}
  >
    {({ data, stale }: any) => (
      <RequestRevalidationFrame
        stale={stale}
        testId="retained-request-shell"
        message={`Updating ${dataset}:${cohort}`}
        focusAfterUpdateSelector="[data-testid=scope-control]"
      >
        <button type="button" data-testid="scope-control">
          {data.value}
        </button>
      </RequestRevalidationFrame>
    )}
  </Query>
)

describe('BaseQuery request identity', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame

  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as any).fetch
    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame
    } else {
      delete (global as any).requestAnimationFrame
    }
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

  test.each([
    {
      transition: 'cohort',
      initial: { dataset: 'gnomad_r4_lr', cohort: 'hgsvc_hprc' },
      next: { dataset: 'gnomad_r4_lr', cohort: 'aou' },
    },
    {
      transition: 'dataset',
      initial: { dataset: 'gnomad_r4_lr', cohort: 'hgsvc_hprc' },
      next: { dataset: 'gnomad_r4', cohort: 'hgsvc_hprc' },
    },
  ])(
    'failed retained $transition revalidation focuses an alert without stale controls',
    async ({ initial, next }) => {
      const first = deferredResponse()
      const second = deferredResponse()
      ;(global as any).fetch = jest
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise)

      const { rerender } = render(<RetainedScopeQuery {...initial} />)
      await act(async () => first.resolve(response('loaded scope')))
      await waitFor(() =>
        expect(screen.getByTestId('scope-control').textContent).toBe('loaded scope')
      )

      rerender(<RetainedScopeQuery {...next} />)

      const updatingStatus = screen.getByRole('status')
      await waitFor(() => expect(document.activeElement).toBe(updatingStatus))
      const staleContent = screen.getByTestId('scope-control').parentElement
      expect(staleContent?.getAttribute('aria-hidden')).toBe('true')
      expect(staleContent?.hasAttribute('inert')).toBe(true)

      await act(async () => second.reject(new Error('request failed')))

      const terminalError = await screen.findByRole('alert')
      expect(terminalError.textContent).toBe(`Unable to load ${next.dataset}:${next.cohort}`)
      expect(terminalError.getAttribute('tabindex')).toBe('-1')
      expect(document.activeElement).toBe(terminalError)
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.queryByTestId('scope-control')).toBeNull()
    }
  )

  test('successful retained revalidation restores focus to the replacement control', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    ;(global as any).fetch = jest
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    ;(global as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    }

    const { rerender } = render(<RetainedScopeQuery dataset="gnomad_r4_lr" cohort="hgsvc_hprc" />)
    await act(async () => first.resolve(response('HGSVC')))
    const initialControl = await screen.findByTestId('scope-control')
    initialControl.focus()

    rerender(<RetainedScopeQuery dataset="gnomad_r4_lr" cohort="aou" />)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('status')))

    await act(async () => second.resolve(response('AoU')))
    await waitFor(() => {
      const replacementControl = screen.getByTestId('scope-control')
      expect(replacementControl.textContent).toBe('AoU')
      expect(document.activeElement).toBe(replacementControl)
    })
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
