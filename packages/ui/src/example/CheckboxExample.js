import React, { Component } from 'react'

import { Checkbox } from '..'

export default class CheckboxExample extends Component {
  state = {
    checked: false,
  }

  render() {
    return (
      <Checkbox
        checked={this.state.checked}
        id="example-checkbox"
        label="Some option"
        onChange={checked => {
          this.setState({ checked })
        }}
      />
    )
  }
}
