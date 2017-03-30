/* eslint-disable camelcase */

import React, { Component } from 'react'
import { fetchTranscriptsByGeneName, test } from 'utilities'  // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'

import TranscriptTrack from '../Tracks/TranscriptTrack'
import PositionTableTrack from '../Tracks/PositionTableTrack'

import css from './styles.css'

class RegionTableExample extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchTranscriptsByGeneName('CD33').then((data) => {
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
    const {
      transcript: { exons },
    } = this.state.data
    const attributeConfig = {
      CDS: {
        color: '#FFB33D',
        thickness: '30px',
      },
      start_pad: {
        color: '#28BCCC',
        thickness: '5px',
      },
      end_pad: {
        color: '#BEEB9F',
        thickness: '5px',
      },
      intron: {
        color: '#FF9559',
        thickness: '5px',
      },
      default: {
        color: '#grey',
        thickness: '5px',
      },
    }
    console.log(exons)
    return (
      <div className={css.page}>
        <RegionViewer
          css={css}
          width={800}
          regions={exons}
          attributeConfig={attributeConfig}
        >
          <TranscriptTrack
            title={''}
            height={50}
          />
          <PositionTableTrack
            title={''}
            height={50}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default RegionTableExample
