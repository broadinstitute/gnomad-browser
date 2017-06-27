/* eslint-disable camelcase */

import React, { Component } from 'react'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'

import { fetchTranscriptsByGeneName, test } from 'lens-utilities'  // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from 'lens-region'

import TranscriptTrack from 'lens-track-transcript'
import PositionTableTrack from 'lens-track-position-table'

import examplePageStyles from './RegionTable.example.css'

class RegionTableExample extends Component {
  state = {
    hasData: false,
    currentGene: 'NEB',
    padding: 150,
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
      'USH2A',
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

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasData) {
      return <p>Loading!</p>
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
      <div className={examplePageStyles.page}>
        <h1>Region viewer demo</h1>
        <Slider
          style={{
            width: 800,
          }}
          onChange={this.setPadding}
        />
        <div>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map(gene =>
              <MenuItem key={`${gene}-menu`} value={gene} primaryText={gene} />,
            )}
          </DropDownMenu>
        </div>
        <RegionViewer
          width={1100}
          regions={exons}
          regionAttributes={attributeConfig}
          padding={this.state.padding}
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
