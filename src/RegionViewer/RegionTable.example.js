/* eslint-disable camelcase */

import React, { Component } from 'react'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'

import { fetchTranscriptsByGeneName, test } from 'utilities'  // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'

import TranscriptTrack from '../Tracks/TranscriptTrack'
import PositionTableTrack from '../Tracks/PositionTableTrack'

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
      'USH2A'
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
    const {
      transcript: { exons },
    } = this.state.data
    const attributeConfig = {
      CDS: {
        color: '#28BCCC',
        thickness: '30px',
      },
      start_pad: {
        color: '#FFB33D',
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
          regions={exons}
          regionAttributes={attributeConfig}
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
