/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'

import { groupExonsByTranscript } from 'utilities'

import RegionViewer from '../../RegionViewer'
import GenericTableTrack from './index'

import css from './styles.css'

import testData from 'data/region-viewer-full-TP53-V1.json'

class GenericTableTrackExample extends Component {
  state = {
    hasData: false,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    this.setState({
      geneData: testData.gene,
      hasData: true,
    })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }

    const { gene_name, exome_variants, exons } = this.state.geneData
    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)

    const canonicalExons = this.state.geneData.transcript.exons

    const regionAttributesConfig = {
      CDS: {
        color: '#9B988F',
        thickness: '30px',
      },
      start_pad: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      end_pad: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      intron: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      default: {
        color: '#grey',
        thickness: '3px',
      },
    }

    const tableDataConfig = {
      fields: [
        { title: 'Variant ID', dataKey: 'variant_id', dataType: 'string' },
        stop
        gene_id
        other_names
        canonical_transcript
        start
        xstop
        xstart
        gene_name
      ],
    }

    return (
      <div className={css.page}>
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
        >
          <GenericTableTrack
            title={'Generic table test'}
            height={200}
            tableConfig={tableDataConfig}
            tableData={exome_variants}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default GenericTableTrackExample
