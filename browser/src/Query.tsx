import React, { Component, useEffect, useRef } from 'react'

import Delayed from './Delayed'
import StatusMessage from './StatusMessage'

const TerminalRequestError = ({ children }: { children: React.ReactNode }) => {
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    statusRef.current?.focus()
  }, [])

  return (
    <StatusMessage ref={statusRef} role="alert" tabIndex={-1}>
      {children}
    </StatusMessage>
  )
}

const areVariablesEqual = (variables: any, otherVariables: any) => {
  const keys = Object.keys(variables)
  const otherKeys = Object.keys(otherVariables)
  if (keys.length !== otherKeys.length) {
    return false
  }
  return keys.every((key) => variables[key] === otherVariables[key])
}

type RequestIdentity = {
  operationName: string | null
  query: string
  requestKey: any
  url: string
  variables: any
}

const requestIdentity = ({ operationName, query, requestKey, url, variables }: BaseQueryProps) => ({
  operationName,
  query,
  requestKey,
  url,
  variables,
})

const areRequestsEqual = (request: RequestIdentity, otherRequest: RequestIdentity) =>
  request.operationName === otherRequest.operationName &&
  request.query === otherRequest.query &&
  request.requestKey === otherRequest.requestKey &&
  request.url === otherRequest.url &&
  areVariablesEqual(request.variables, otherRequest.variables)

const cancelable = (promise: any) => {
  let isCanceled = false
  const wrapper = new Promise((resolve: any, reject: any) => {
    promise.then(
      (value: any) => {
        if (!isCanceled) {
          resolve(value)
        }
      },
      (error: any) => {
        if (!isCanceled) {
          reject(error)
        }
      }
    )
  })

  return {
    cancel: () => {
      isCanceled = true
    },
    promise: wrapper,
  }
}

type BaseQueryState = any

type BaseQueryProps = {
  operationName: string | null
  query: string
  requestKey?: any
  url: string
  variables?: any
  children: (state: BaseQueryState) => JSX.Element
}

export class BaseQuery extends Component<BaseQueryProps, BaseQueryState> {
  static defaultProps = {
    url: '/api/',
    operationName: null,
    variables: {},
  }

  currentRequest: any

  mounted: any

  constructor(props: BaseQueryProps) {
    super(props)
    this.state = {
      data: null,
      dataRequest: null,
      error: null,
      graphQLErrors: null,
      loading: true,
      request: requestIdentity(props),
    }
  }

  static getDerivedStateFromProps(props: BaseQueryProps, state: BaseQueryState) {
    const nextRequest = requestIdentity(props)
    if (!areRequestsEqual(nextRequest, state.request)) {
      // componentDidUpdate starts the request after this render. Marking the new
      // identity as loading here prevents children from rendering once with old
      // data and new props (and starting duplicate child requests).
      return {
        error: null,
        graphQLErrors: null,
        loading: true,
        request: nextRequest,
      }
    }
    return null
  }

  componentDidMount() {
    this.mounted = true
    this.loadData()
  }

  componentDidUpdate(prevProps: BaseQueryProps) {
    if (!areRequestsEqual(requestIdentity(this.props), requestIdentity(prevProps))) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    this.mounted = false
    if (this.currentRequest) this.currentRequest.cancel()
  }

  loadData() {
    const { operationName, query, url, variables } = this.props
    const request = requestIdentity(this.props)

    this.setState({
      loading: true,
      error: null,
      graphQLErrors: null,
      request,
    })

    if (this.currentRequest) {
      this.currentRequest.cancel()
    }

    this.currentRequest = cancelable(
      fetch(url, {
        body: JSON.stringify({
          operationName,
          query,
          variables,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => response.json())
    )
    this.currentRequest.promise.then(
      (response: any) => {
        if (!this.mounted) {
          return
        }
        this.setState({
          data: response.data,
          dataRequest: request,
          error: null,
          graphQLErrors: response.errors,
          loading: false,
        })
      },
      (error: any) => {
        if (!this.mounted) {
          return
        }
        this.setState({
          data: null,
          dataRequest: null,
          error,
          graphQLErrors: null,
          loading: false,
        })
      }
    )
  }

  render() {
    const { children } = this.props
    return children(this.state)
  }
}

type OwnQueryProps = {
  children: (...args: any[]) => any
  errorMessage?: string
  loadingMessage?: string
  loadingPlaceholderHeight?: number
  operationName: string | null
  query: string
  requestKey?: any
  rejectGraphQLErrors?: boolean
  retainPreviousData?: boolean
  success?: (...args: any[]) => any
  url: string
  variables?: any
}

// @ts-expect-error TS(2456) FIXME: Type alias 'QueryProps' circularly references itse... Remove this comment to see the full error message
type QueryProps = OwnQueryProps & typeof Query.defaultProps

// @ts-expect-error TS(7022) FIXME: 'Query' implicitly has type 'any' because it does ... Remove this comment to see the full error message
const Query = ({
  children,
  errorMessage,
  loadingMessage,
  loadingPlaceholderHeight,
  operationName,
  query,
  requestKey,
  rejectGraphQLErrors,
  retainPreviousData,
  success,
  url,
  variables,
}: QueryProps) => {
  const renderError = (message: React.ReactNode) =>
    retainPreviousData ? (
      <TerminalRequestError>{message}</TerminalRequestError>
    ) : (
      <StatusMessage>{message}</StatusMessage>
    )

  return (
    <BaseQuery
      operationName={operationName}
      query={query}
      requestKey={requestKey}
      url={url}
      variables={variables}
    >
      {({ data, dataRequest, error, graphQLErrors, loading }: any) => {
        if (loading && retainPreviousData && data && success(data)) {
          return children({
            data,
            requestKey: dataRequest?.requestKey,
            requestVariables: dataRequest?.variables,
            stale: true,
          })
        }

        if (loading) {
          return (
            <div style={{ height: loadingPlaceholderHeight || 'auto' }}>
              <Delayed>
                <StatusMessage>{loadingMessage}</StatusMessage>
              </Delayed>
            </div>
          )
        }

        if (error) {
          return renderError(errorMessage)
        }

        if (rejectGraphQLErrors && graphQLErrors?.length) {
          return renderError(
            Array.from(new Set(graphQLErrors.map((e: any) => e.message))).join(', ')
          )
        }

        if (!data || !success(data)) {
          return renderError(
            graphQLErrors && graphQLErrors.length
              ? Array.from(new Set(graphQLErrors.map((e: any) => e.message))).join(', ')
              : errorMessage
          )
        }

        return children({
          data,
          requestKey: dataRequest?.requestKey,
          requestVariables: dataRequest?.variables,
          stale: false,
        })
      }}
    </BaseQuery>
  )
}

Query.defaultProps = {
  errorMessage: 'Error',
  loadingMessage: 'Loading',
  loadingPlaceholderHeight: undefined,
  success: () => true,
  url: '/api/',
  variables: {},
  operationName: null,
  requestKey: undefined,
  rejectGraphQLErrors: false,
  retainPreviousData: false,
}

export default Query
