/* eslint-disable camelcase */

import React, { Component } from 'react'
import Slider from 'material-ui/Slider'

import {
  fetchAllByGeneName,
  groupExonsByTranscript,
} from 'utilities'

 // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from '../../../RegionViewer'

import CoverageTrack from '../index'
import TranscriptTrack from '../../TranscriptTrack'

import examplePageStyles from './CoverageTrack.example.css'

const testGenes = [
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
]

import testData from 'data/region-viewer-full-PCSK9-v1.json'
// import testData from 'data/region-viewer-full-ZNF658-v1.json'
// import testData from 'data/region-viewer-full-MYH9-v1.json'
// import testData from 'data/region-viewer-full-FMR1-v1.json'
// import testData from 'data/region-viewer-full-BRCA2-v1.json'
// import testData from 'data/region-viewer-full-CFTR-v1.json'
// import testData from 'data/region-viewer-full-FBN1-v1.json'
// import testData from 'data/region-viewer-full-TP53-v1.json'
// import testData from 'data/region-viewer-full-SCN5A-v1.json'
// import testData from 'data/region-viewer-full-MYH7-v1.json'
// import testData from 'data/region-viewer-full-MYBPC3-v1.json'
// import testData from 'data/region-viewer-full-ARSF-v1.json'
// import testData from 'data/region-viewer-full-CD33-v1.json'

class RegionViewerFullExample extends Component {
  state = {
    hasData: false,
    padding: 150,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    // fetchAllByGeneName('TP53').then((data) => {
    //   this.setState({ data })
    //   this.setState({ hasData: true })
    //   this.forceUpdate()
    // })
    // const gene = 'data/region-viewer-full-PCSK9.json'
    this.setState({
      // data: testData.gene,
      data: testData.gene,
      hasData: true,
    })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasData) {
      return <p>Loading!</p>
    }
    // const { transcript: { exons }, exome_coverage, genome_coverage } = this.state.data
    const {
      transcript: { exons },
      exome_coverage,
      genome_coverage,
      exacv1_coverage,
    } = this.state.data
    const geneExons = this.state.data.exons
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
    const coverageConfig = {
      datasets: [
        // {
        //   name: 'exacv1',
        //   data: exacv1_coverage,
        //   type: 'line',
        //   color: 'red',
        //   opacity: 1,
        //   strokeWidth: 2,
        // },
        {
          name: 'exome',
          data: exome_coverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          strokeWidth: 2,
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genome_coverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 2,
          opacity: 0.5,
        },
      ],
    }
    return (
      <div className={examplePageStyles.page}>
        <Slider
          style={{
            width: 800,
          }}
          onChange={this.setPadding}
        />
        <RegionViewer
          width={1000}
          regions={exons}
          regionAttributes={regionAttributesConfig}
          padding={this.state.padding}
        >
          <CoverageTrack
            title={'Coverage'}
            height={120}
            dataConfig={coverageConfig}
            yTickNumber={11}
            yMax={110}
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

export default RegionViewerFullExample
