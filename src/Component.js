import React, { Component } from 'react'
// import R from 'ramda'

import {
  fetchTranscriptsByGeneName,
  groupExonsByTranscript,
  RegionViewer,
  TranscriptTrack,
} from 'react-gnomad'

import css from './styles.css'

const API_URL = 'http://gnomad-api.broadinstitute.org'

class RegionTableExample extends Component {
  state = {
    hasData: false,
    currentGene: 'TP53',
    testGenes: [
      'PCSK9',
      'ZNF658',
      'MYH9',
      'FMR1',
      'BRCA2',
      'CFTR',
      'FBN1',
      'TP53',
      'SCN5A',
      'MYH7',
      'MYBPC3',
      'ARSF',
      'CD33',
      'DMD',
      'TTN',
    ],
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene) {
      this.fetchData()
    }
  }

  fetchData = () => {
    fetchTranscriptsByGeneName(this.state.currentGene, API_URL).then((data) => {
      this.setState({ data })
      this.setState({ hasData: true })
    })
  }

  handleChange = (event, index, value) => {
    console.log(value)
    this.setState({ currentGene: value })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    console.log(this.state.data)
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
    const transcriptsGrouped = groupExonsByTranscript(geneExons)
    console.log(RegionViewer)
    console.log(TranscriptTrack)
    return (
      <div className={css.page}>
        <RegionViewer
          css={css}
          width={1100}
          regions={canonicalExons}
          regionAttributes={attributeConfig}
        >
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default RegionTableExample
