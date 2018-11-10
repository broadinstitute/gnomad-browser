import PropTypes from 'prop-types'
import React, { Component } from 'react'

import Autocomplete from 'react-autocomplete'

import { Input, Item, menuStyle } from './Combobox'

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

const renderInput = props => {
  // eslint-disable-next-line react/prop-types
  const { id, ref, ...rest } = props
  return <Input {...rest} id={id} innerRef={ref} />
}

const renderItem = (item, isHighlighted) => <Item isHighlighted={isHighlighted}>{item.label}</Item>

export class Searchbox extends Component {
  static propTypes = {
    fetchSearchResults: PropTypes.func.isRequired,
    id: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    width: PropTypes.string,
  }

  static defaultProps = {
    id: undefined,
    placeholder: undefined,
    width: undefined,
  }

  state = {
    inputValue: '',
    options: [],
  }

  fetchSearchResults = debounce(query => {
    const { fetchSearchResults } = this.props

    if (this.searchRequest) {
      this.searchRequest.cancel()
    }

    if (!query) {
      this.setState({ options: [] })
      return
    }

    this.searchRequest = new CancelablePromise((resolve, reject) => {
      fetchSearchResults(query).then(resolve, reject)
    })

    this.searchRequest.then(results => {
      this.setState({ options: results })
    })
  }, 400)

  onChange = (e, inputValue) => {
    this.setState({ inputValue })
    this.fetchSearchResults(inputValue)
  }

  onSelect = (value, item) => {
    const { onSelect } = this.props
    this.setState({ inputValue: item.label })
    onSelect(item.value, item)
  }

  render() {
    const { id, placeholder, width } = this.props
    const { inputValue, options } = this.state

    return (
      <Autocomplete
        getItemValue={item => item.label}
        inputProps={{ id, placeholder }}
        items={options}
        menuStyle={menuStyle}
        renderInput={renderInput}
        renderItem={renderItem}
        shouldItemRender={() => true}
        value={inputValue}
        wrapperStyle={{
          display: 'inline-block',
          width,
        }}
        onChange={this.onChange}
        onSelect={this.onSelect}
      />
    )
  }
}
