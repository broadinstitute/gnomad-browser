import PropTypes from 'prop-types'
import React, { Component } from 'react'

import Delayed from './Delayed'
import StatusMessage from './StatusMessage'

const areVariablesEqual = (variables, otherVariables) => {
  const keys = Object.keys(variables)
  const otherKeys = Object.keys(otherVariables)
  if (keys.length !== otherKeys.length) {
    return false
  }
  return keys.every(key => variables[key] === otherVariables[key])
}

const cancelable = promise => {
  let isCanceled = false
  const wrapper = new Promise((resolve, reject) => {
    promise.then(
      value => {
        if (!isCanceled) {
          resolve(value)
        }
      },
      error => {
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

export class BaseQuery extends Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    url: PropTypes.string,
    variables: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }

  static defaultProps = {
    url: '/api/',
    variables: {},
  }

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

  componentDidUpdate(prevProps) {
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
      }).then(response => response.json())
    )
    this.currentRequest.promise.then(
      response => {
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
      error => {
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
    const { children } = this.props
    return children(this.state)
  }
}

const Query = ({
  children,
  errorMessage,
  loadingMessage,
  loadingPlaceholderHeight,
  query,
  success,
  url,
  variables,
}) => {
  return (
    <BaseQuery query={query} url={url} variables={variables}>
      {({ data, error, graphQLErrors, loading }) => {
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
                ? Array.from(new Set(graphQLErrors.map(e => e.message))).join(', ')
                : errorMessage}
            </StatusMessage>
          )
        }

        return children({ data })
      }}
    </BaseQuery>
  )
}

Query.propTypes = {
  children: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  loadingPlaceholderHeight: PropTypes.number,
  query: PropTypes.string.isRequired,
  success: PropTypes.func,
  url: PropTypes.string,
  variables: PropTypes.object, // eslint-disable-line react/forbid-prop-types
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
