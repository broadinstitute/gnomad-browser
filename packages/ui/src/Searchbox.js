import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Combobox } from './Combobox'

const debounce = (fn, ms) => {
  let timeout

  return function(...args) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => fn(...args), ms)
  }
}

class CancelablePromise {
  isCanceled = false

  constructor(executor) {
    this.promise = new Promise((resolve, reject) => {
      const wrappedResolve = value => {
        if (!this.isCanceled) {
          resolve(value)
        }
      }

      const wrappedReject = value => {
        if (!this.isCanceled) {
          reject(value)
        }
      }

      return executor(wrappedResolve, wrappedReject)
    })
  }

  cancel() {
    this.isCanceled = true
  }

  then(onFulfilled, onRejected) {
    return this.promise.then(onFulfilled, onRejected)
  }
}

export class Searchbox extends Component {
  static propTypes = {
    fetchSearchResults: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
  }

  state = {
    options: [],
  }

  onChange = debounce(query => {
    if (this.searchRequest) {
      this.searchRequest.cancel()
    }

    if (!query) {
      return
    }

    this.searchRequest = new CancelablePromise((resolve, reject) => {
      this.props.fetchSearchResults(query).then(resolve, reject)
    })

    this.searchRequest.then(results => {
      this.setState({ options: results })
    })
  }, 400)

  render() {
    return (
      <Combobox
        {...this.props}
        onChange={this.onChange}
        options={this.state.options}
        renderAllOptions
        value=""
      />
    )
  }
}
