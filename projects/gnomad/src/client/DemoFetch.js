import PropTypes from 'prop-types'
import { Component } from 'react'

const makeCancelable = promise => {
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

  wrapper.cancel = () => {
    isCanceled = true
  }

  return wrapper
}

class Fetch extends Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    url: PropTypes.string.isRequired,
  }

  state = {
    data: null,
    error: null,
    loading: true,
  }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    const { url } = this.props
    if (url !== prevProps.url) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    if (this.currentRequest) {
      this.currentRequest.cancel()
    }
  }

  loadData() {
    const { url } = this.props

    this.setState({
      loading: true,
      error: null,
    })

    if (this.currentRequest) {
      this.currentRequest.cancel()
    }

    this.currentRequest = makeCancelable(fetch(url))
    this.currentRequest
      .then(response => {
        if (!response.ok) {
          throw response
        }
        return response.json()
      })
      .then(
        data => {
          this.setState({
            data,
            error: null,
            loading: false,
          })
        },
        response =>
          response.json().then(data => {
            this.setState({
              data,
              error: response,
              loading: false,
            })
          })
      )
  }

  render() {
    const { children } = this.props
    return children(this.state)
  }
}

export default Fetch
