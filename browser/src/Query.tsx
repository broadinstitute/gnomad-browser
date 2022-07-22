import React, { Component } from 'react'

import Delayed from './Delayed'
import StatusMessage from './StatusMessage'

const areVariablesEqual = (variables: any, otherVariables: any) => {
  const keys = Object.keys(variables)
  const otherKeys = Object.keys(otherVariables)
  if (keys.length !== otherKeys.length) {
    return false
  }
  return keys.every((key) => variables[key] === otherVariables[key])
}

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

type OwnBaseQueryProps = {
  query: string
  url?: string
  variables?: any
}

type BaseQueryState = any

type BaseQueryProps = OwnBaseQueryProps & typeof BaseQuery.defaultProps

export class BaseQuery extends Component<BaseQueryProps, BaseQueryState> {
  static defaultProps = {
    url: '/api/',
    variables: {},
  }

  currentRequest: any
  mounted: any

  state = {
    data: null,
    error: null,
    graphQLErrors: null,
    loading: true,
  }

  componentDidMount() {
    this.mounted = true
    this.loadData()
  }

  componentDidUpdate(prevProps: BaseQueryProps) {
    const { query, variables } = this.props
    if (query !== prevProps.query || !areVariablesEqual(variables, prevProps.variables)) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    this.mounted = false
  }

  loadData() {
    const { query, url, variables } = this.props

    this.setState({
      loading: true,
      error: null,
      graphQLErrors: null,
    })

    if (this.currentRequest) {
      this.currentRequest.cancel()
    }

    this.currentRequest = cancelable(
      fetch(url, {
        body: JSON.stringify({
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
          error,
          graphQLErrors: null,
          loading: false,
        })
      }
    )
  }

  render() {
    // @ts-expect-error TS(2339) FIXME: Property 'children' does not exist on type 'Readon... Remove this comment to see the full error message
    const { children } = this.props
    return children(this.state)
  }
}

type OwnQueryProps = {
  children: (...args: any[]) => any
  errorMessage?: string
  loadingMessage?: string
  loadingPlaceholderHeight?: number
  query: string
  success?: (...args: any[]) => any
  url?: string
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
  query,
  success,
  url,
  variables,
}: QueryProps) => {
  return (
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <BaseQuery query={query} url={url} variables={variables}>
      {({ data, error, graphQLErrors, loading }: any) => {
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
          return <StatusMessage>{errorMessage}</StatusMessage>
        }

        if (!data || !success(data)) {
          return (
            <StatusMessage>
              {graphQLErrors && graphQLErrors.length
                ? Array.from(new Set(graphQLErrors.map((e: any) => e.message))).join(', ')
                : errorMessage}
            </StatusMessage>
          )
        }

        return children({ data })
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
}

export default Query
