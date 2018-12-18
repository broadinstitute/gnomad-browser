import React, { Component } from 'react'

import { SegmentedControl } from '..'

export default class SegmentedControlExample extends Component {
  state = {
    options: [{ value: 'foo' }, { value: 'bar' }, { value: 'baz', disabled: true }],
    value: 'foo',
  }

  onChange = value => {
    this.setState({ value })
  }

  render() {
    const { options, value } = this.state
    return (
      <SegmentedControl
        id="segmented-control-example"
        options={options}
        value={value}
        onChange={this.onChange}
      />
    )
  }
}
