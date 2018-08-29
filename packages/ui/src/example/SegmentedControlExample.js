import React, { Component } from 'react'

import { SegmentedControl } from '..'

export default class SegmentedControlExample extends Component {
  state = {
    options: [{ value: 'foo' }, { value: 'bar' }, { value: 'baz' }],
    value: 'foo',
  }

  onChange = value => {
    this.setState({ value })
  }

  render() {
    return (
      <SegmentedControl
        id="segmented-control-example"
        options={this.state.options}
        value={this.state.value}
        onChange={this.onChange}
      />
    )
  }
}
