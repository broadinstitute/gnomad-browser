/* eslint-disable camelcase */

import React, { Component } from 'react'
import { fetchGene, test } from 'utilities'  // eslint-disable-line
import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'
import CoverageTrack from '../Tracks/CoverageTrack'
import css from './styles.css'

class TestComponentDemo extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchGene('PCSK9').then((data) => {
      this.setState({ data })
      this.setState({ hasData: true })
      this.forceUpdate()
    })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    // const { transcript: { exons }, exome_coverage, genome_coverage } = this.state.data
    const { transcript: { exons }, exome_coverage, genome_coverage } = data.gene
    return (
      <div>
        <RegionViewer
          css={css}
          width={800}
          regions={exons}
        >
          <CoverageTrack
            height={200}
            exomeCoverage={exome_coverage}
            genomeCoverage={genome_coverage}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default TestComponentDemo
