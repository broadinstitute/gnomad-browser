import React, { Component } from 'react'
import { fetchGene, test } from 'utilities'  // eslint-disable-line

import TestComponent from './TestComponent'
import css from './styles.css'

class TestComponentDemo extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchGene('PPARA').then((data) => {
      this.setState({ geneId: data.gene_id })
      this.setState({ hasData: true })
    })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    const { geneId } = this.state
    return (
      <div>
        <TestComponent name={test()} geneId={geneId} />
      </div>
    )
  }
}

export default TestComponentDemo
