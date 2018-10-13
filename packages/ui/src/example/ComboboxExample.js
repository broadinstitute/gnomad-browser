import React, { Component } from 'react'

import { Combobox } from '..'

export default class ComboboxExample extends Component {
  state = {
    value: 'foo',
  }

  render() {
    return (
      <Combobox
        options={['foo', 'bar', 'baz', 'qux'].map(s => ({ label: s, value: s }))}
        onSelect={value => {
          this.setState({ value })
        }}
        value={this.state.value}
      />
    )
  }
}
