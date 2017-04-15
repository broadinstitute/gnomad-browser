/* eslint-disable camelcase */

import React, { Component } from 'react'
import {
  groupExonsByTranscript,
} from 'utilities'

import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../TranscriptTrack'
import NigiriTrack from './index'


import css from './styles.css'

import testGene from 'data/region-viewer-full-CAPN3-v1.json'
import testCoverage from 'data/sashimi-15-42681621-42685368.coverage.csv'
import testJunctions from 'data/sashimi-15-42681621-42685368.junctions.csv'

class NigiriTrackExample extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    this.setState({
      geneData: testGene.gene,
      coverage: testCoverage,
      junctions: testJunctions,
      hasData: true,
    })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }

    const {
      transcript: { exons },
    } = this.state.geneData
    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)
    const regionAttributesConfig = {
      CDS: {
        color: '#212121',
        thickness: '30px',
      },
      start_pad: {
        color: '#BDBDBD',
        thickness: '3px',
      },
      end_pad: {
        color: '#BDBDBD',
        thickness: '3px',
      },
      intron: {
        color: '#BDBDBD',
        thickness: '3px',
      },
      default: {
        color: '#grey',
        thickness: '3px',
      },
    }
    const coverage_control = this.state.coverage.map(base =>
      ({ pos: Number(base.pos), reading: Number(base.series1) }))
    const coverage_patient = this.state.coverage.map(base =>
      ({ pos: Number(base.pos), reading: Number(base.series2) }))

    const junctions_control = this.state.junctions.map(base =>
      ({ pos: Number(base.pos), reading: Number(base.series1) }))
    const junctions_patient = this.state.junctions.map(base =>
      ({ pos: Number(base.pos), reading: Number(base.series2) }))

    // console.log(this.state.coverage)
    // console.log(this.state.junctions)
    return (
      <div className={css.page}>
        <RegionViewer
          css={css}
          width={1000}
          regions={exons}
          regionAttributes={regionAttributesConfig}
        >
          <NigiriTrack
            height={200}
            domainMax={750}
            coverage={coverage_control}
            junctions={junctions_control}
          />
          <NigiriTrack
            height={200}
            domainMax={2000}
            coverage={coverage_patient}
            junctions={junctions_patient}
          />
          <TranscriptTrack
            height={10}
            transcriptsGrouped={transcriptsGrouped}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default NigiriTrackExample
