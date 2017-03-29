/* eslint-disable camelcase */

import React, { Component } from 'react'
import { fetchGene, test } from 'utilities'  // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'
import CoverageTrack from '../Tracks/CoverageTrack'
import TranscriptTrack from '../Tracks/TranscriptTrack'
import VariantTrack from '../Tracks/VariantTrack'
import PositionTableTrack from '../Tracks/PositionTableTrack'

import VariantsTable from '../VariantsTable'

import css from './styles.css'

class TestComponentDemo extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchGene('CD33').then((data) => {
      console.log(data)
      this.setState({ data })
      this.setState({ hasData: true })
      this.forceUpdate()
    })
  }

  render() {
    console.log(this.state)
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    // const { transcript: { exons }, exome_coverage, genome_coverage } = this.state.data
    const {
      transcript: { exons },
      exome_coverage,
      genome_coverage,
      exome_variants,
      genome_variants,
    } = this.state.data
    return (
      <div className={css.page}>
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
          <VariantTrack
            title={'Exome variants'}
            height={50}
            variants={exome_variants}
          />
          <VariantTrack
            title={'Genome variants'}
            height={50}
            variants={genome_variants}
          />
          <TranscriptTrack
            title={'Transcript'}
            height={50}
          />
          <PositionTableTrack
            title={'Region positions'}
            height={50}
          />
        </RegionViewer>
        <VariantsTable
          variantsData={exome_variants}
        />
      </div>
    )
  }
}

export default TestComponentDemo
