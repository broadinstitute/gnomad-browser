/* eslint-disable camelcase */

import React, { Component } from 'react'
import { fetchAllByGeneName, test } from 'utilities'  // eslint-disable-line
// import data from 'data/PCSK9-transcript.json'  // eslint-disable-line

import RegionViewer from './RegionViewer'

import CoverageTrack from '../Tracks/CoverageTrack'
import TranscriptTrack from '../Tracks/TranscriptTrack'
import VariantTrack from '../Tracks/VariantTrack'
import PositionTableTrack from '../Tracks/PositionTableTrack'

import VariantsTable from '../VariantsTable'

import css from './styles.css'

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

// import testData from 'data/region-viewer-full-PCSK9.json'
// import testData from 'data/region-viewer-full-ZNF658.json'
// import testData from 'data/region-viewer-full-MYH9.json'
// import testData from 'data/region-viewer-full-FMR1.json'
// import testData from 'data/region-viewer-full-BRCA2.json'
// import testData from 'data/region-viewer-full-CFTR.json'
// import testData from 'data/region-viewer-full-FBN1.json'
import testData from 'data/region-viewer-full-TP53.json'
// import testData from 'data/region-viewer-full-SCN5A.json'
// import testData from 'data/region-viewer-full-MYH7.json'
// import testData from 'data/region-viewer-full-MYBPC3.json'
// import testData from 'data/region-viewer-full-ARSF.json'
// import testData from 'data/region-viewer-full-CD33.json'

class RegionViewerFullExample extends Component {
  state = {
    hasData: false,
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
      hasData: true
    })
  }

  render() {
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
    const geneExons = this.state.data.exons
    const regionAttributesConfig = {
      CDS: {
        color: '#212121',
        thickness: '30px',
      },
      start_pad: {
        color: '#BDBDBD',
        thickness: '5px',
      },
      end_pad: {
        color: '#BDBDBD',
        thickness: '5px',
      },
      intron: {
        color: '#BDBDBD',
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
          width={1100}
          regions={exons}
          regionAttributes={regionAttributesConfig}
        >
          <CoverageTrack
            height={200}
            exomeCoverage={exome_coverage}
            genomeCoverage={genome_coverage}
          />
          <VariantTrack
            title={'exome variant density'}
            height={50}
            variants={exome_variants}
          />
          <VariantTrack
            title={'genome variant density'}
            height={50}
            variants={genome_variants}
          />
          <TranscriptTrack
            title={''}
            height={10}
            geneExons={geneExons}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default RegionViewerFullExample
