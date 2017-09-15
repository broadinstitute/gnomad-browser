/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'

import { groupExonsByTranscript } from '@broad/utilities/lib/transcriptTools'
import RegionViewer from '@broad/region'
import TranscriptTrack from '@broad/track-transcript'
import VariantTrack from '@broad/track-variant'
import GenericTableTrack from '../index'

import css from './styles.css'

const API_URL = process.env.API_URL

// import testData from 'data/region-viewer-full-TP53-V1.json'

export const genericTableFetch = (geneName, dataset) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_name
      exons {
        _id
        start
        transcript_id
        feature_type
        strand
        stop
        chrom
        gene_id
      }
      transcript {
        exons {
          _id
          start
          transcript_id
          feature_type
          strand
          stop
          chrom
          gene_id
        }
      }
      variants: ${dataset}_variants {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        resolve(data.data.gene)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

class GenericTableTrackExample extends Component {
  state = {
    hasData: false,
    currentGene: 'BRCA2',
    currentDataset: 'exacv1',
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
    ],
    datasets: [
      'exacv1',
      'exome',
      'genome',
    ],
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene ||
      previousState.currentDataset !== this.state.currentDataset) {
      this.fetchData()
    }
  }

  fetchData = () => {
    genericTableFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      this.setState({ geneData: data })
      this.setState({ hasData: true })
    })
  }

  handleChange = (event, index, value) => {
    this.setState({ currentGene: value })
  }

  handleDatasetChange = (event, index, value) => {
    this.setState({ currentDataset: value })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }

    const { gene_name, variants } = this.state.geneData
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
        { dataKey: 'variant_id', title: 'Variant ID', dataType: 'string' },
        { dataKey: 'rsid', title: 'RSID', dataType: 'string' },
        { dataKey: 'filter', title: 'Filter', dataType: 'filter' },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer' },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer' },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float' },
      ],
    }

    return (
      <div className={css.page}>
        <div>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map(gene =>
              <MenuItem key={`${gene}-menu`} value={gene} primaryText={gene} />,
            )}
          </DropDownMenu>
          <DropDownMenu value={this.state.currentDataset} onChange={this.handleDatasetChange}>
            {this.state.datasets.map(dataset =>
              <MenuItem key={`${dataset}-menu`} value={dataset} primaryText={dataset} />,
            )}
          </DropDownMenu>
        </div>
        <Slider
          style={{
            width: 800,
          }}
          onChange={this.setPadding}
        />
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
          padding={this.state.padding}
        >
          <VariantTrack
            title={'Exome variants'}
            height={25}
            variants={variants}
            trackKey={'exome_variants'}
          />
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          <GenericTableTrack
            title={`Twenty ${this.state.currentDataset} ${gene_name} variants`}
            height={200}
            tableConfig={tableDataConfig}
            tableData={R.take(20, variants)}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default GenericTableTrackExample
