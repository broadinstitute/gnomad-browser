import React, { Component } from 'react'

import { ConsequenceCategoriesControl } from '..'

export default class ConsequenceCategoriesControlExample extends Component {
  state = {
    categorySelections: {
      lof: false,
      missense: false,
      synonymous: false,
      other: false,
    },
  }

  onChange = categorySelections => {
    this.setState({ categorySelections })
  }

  render() {
    return (
      <ConsequenceCategoriesControl
        id="consequence-categories-control-example"
        categorySelections={this.state.categorySelections}
        onChange={this.onChange}
      />
    )
  }
}
