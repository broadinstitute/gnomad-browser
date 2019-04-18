import gqlFetch from 'graphql-fetch'
import PropTypes from 'prop-types'
import { Component } from 'react'

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

const cache = new Map()

const fetchQueryResults = (query, variables, cacheKey) => {
  if (cacheKey && cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const request = gqlFetch('/api')(query, variables)

  if (cacheKey) {
    cache.set(cacheKey, request)
  }

  return request
}

class Query extends Component {
  static propTypes = {
    cacheKey: PropTypes.string,
    children: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    variables: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }

  static defaultProps = {
    cacheKey: undefined,
    variables: {},
  }

  state = {
    data: null,
    error: null,
    graphQLErrors: null,
    loading: true,
  }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    const { query, variables } = this.props
    if (query !== prevProps.query || !areVariablesEqual(variables, prevProps.variables)) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    if (this.currentRequest) {
      this.currentRequest.cancel()
    }
  }

  loadData() {
    const { cacheKey, query, variables } = this.props

    this.setState({
      loading: true,
      error: null,
      graphQLErrors: null,
    })

    if (this.currentRequest) {
      this.currentRequest.cancel()
    }

    this.currentRequest = cancelable(fetchQueryResults(query, variables, cacheKey))
    this.currentRequest.promise.then(
      response => {
        this.setState({
          data: response.data,
          error: null,
          graphQLErrors: response.errors,
          loading: false,
        })
      },
      error => {
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

export default Query
