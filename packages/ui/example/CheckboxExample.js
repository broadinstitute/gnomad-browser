import React, { Component } from 'react'

import { Checkbox } from '../src'

export default class CheckboxExample extends Component {
  state = {
    isChecked: false,
  }

  render() {
    const { isChecked } = this.state
    return (
      <Checkbox
        checked={isChecked}
        id="example-checkbox"
        label="Some option"
        onChange={value => {
          this.setState({ isChecked: value })
        }}
      />
    )
  }
}
