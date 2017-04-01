/* eslint-disable camelcase */
import React, { Component } from 'react'
import R from 'ramda'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'

import {
  fetchTranscriptsByGeneName,
} from 'utilities'  // eslint-disable-line

import testData from 'data/transcript-tools-CD33.json'  // eslint-disable-line
import RegionViewer from './RegionViewer'
import TranscriptTrack from '../Tracks/TranscriptTrack'

import css from './styles.css'

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
    fetchTranscriptsByGeneName(this.state.currentGene).then((data) => {
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
        <div>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map(gene =>
              <MenuItem key={`${gene}-menu`} value={gene} primaryText={gene} />
            )}
          </DropDownMenu>
        </div>
        <RegionViewer
          css={css}
          width={1100}
          regions={canonicalExons}
          regionAttributes={attributeConfig}
        >
          <TranscriptTrack
            title={''}
            geneExons={geneExons}
            height={15}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default RegionTableExample
