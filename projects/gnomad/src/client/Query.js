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

export class Query extends Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    variables: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }

  static defaultProps = {
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
    const { query, variables } = this.props

    this.setState({
      loading: true,
      error: null,
      graphQLErrors: null,
    })

    if (this.currentRequest) {
      this.currentRequest.cancel()
    }

    this.currentRequest = cancelable(gqlFetch(process.env.GNOMAD_API_URL)(query, variables))
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
