/* eslint-disable camelcase */
import React, { Component } from 'react'

import R from 'ramda'

import {
  fetchTranscriptsByGeneName,
  test,
} from 'utilities'  // eslint-disable-line

import testData from 'data/transcript-tools-CD33.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'

import TranscriptTrack from '../Tracks/TranscriptTrack'

import css from './styles.css'

class RegionTableExample extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    fetchTranscriptsByGeneName('BRCA2').then((data) => {
      this.setState({ data })
      this.setState({ hasData: true })
      this.forceUpdate()
    })
    // this.setState({ data: testData.gene })
    // this.setState({ hasData: true })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    const geneExons = this.state.data.exons
    const canonicalExons = this.state.data.transcript.exons
    const attributeConfig = {
      CDS: {
        color: '#424242',
        thickness: '30px',
      },
      start_pad: {
        color: '#e0e0e0',
        thickness: '5px',
      },
      end_pad: {
        color: '#e0e0e0',
        thickness: '5px',
      },
      intron: {
        color: '#e0e0e0',
        thickness: '5px',
      },
      default: {
        color: '#grey',
        thickness: '5px',
      },
    }
    return (
      <div className={css.page}>
        <RegionViewer
          css={css}
          width={800}
          regions={canonicalExons}
          regionAttributes={attributeConfig}
        >
          <TranscriptTrack
            title={''}
            geneExons={geneExons}
            height={50}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default RegionTableExample
