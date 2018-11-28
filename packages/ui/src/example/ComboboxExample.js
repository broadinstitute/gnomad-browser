import React, { Component } from 'react'

import { Combobox } from '..'

export default class ComboboxExample extends Component {
  state = {
    value: 'foo',
  }

  render() {
    const { value } = this.state
    return (
      <Combobox
        options={['foo', 'bar', 'baz', 'qux'].map(s => ({ label: s }))}
        onSelect={selectedOption => {
          this.setState({ value: selectedOption.label })
        }}
        value={value}
      />
    )
  }
}
