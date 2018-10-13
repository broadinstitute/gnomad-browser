import PCancelable from 'p-cancelable'
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

    this.searchRequest = new PCancelable((resolve, reject, onCancel) => {
      onCancel.shouldReject = false // eslint-disable-line no-param-reassign
      this.props.fetchSearchResults(query).then(resolve, reject)
    })

    this.searchRequest.then(results => {
      this.setState({ options: results })
    })
  }, 400)

  render() {
    return (
      <Combobox {...this.props} onChange={this.onChange} options={this.state.options} value="" />
    )
  }
}
