/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'

import { groupExonsByTranscript } from 'utilities'

import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../TranscriptTrack'
import VariantTrack from '../VariantTrack'
import GenericTableTrack from './index'

import css from './styles.css'

const API_URL = process.env.API_URL

// import testData from 'data/region-viewer-full-TP53-V1.json'

export const genericTableFetch = (geneName) => {
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
      exome_variants {
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
      .then(data => {
        console.log(data)
        resolve(data.data.gene)
      })
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}

class GenericTableTrackExample extends Component {
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
    genericTableFetch(this.state.currentGene).then((data) => {
      console.log(data)
      this.setState({ geneData: data })
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

    const { gene_name, exome_variants } = this.state.geneData
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
        { dataKey: 'allele_count', title: 'Allele count', dataType: 'integer' },
        { dataKey: 'allele_num', title: 'Allele number', dataType: 'integer' },
        { dataKey: 'allele_freq', title: 'Allele frequency', dataType: 'float' },
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
        </div>
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
        >
          <VariantTrack
            title={'Exome variants'}
            height={25}
            variants={exome_variants}
          />
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          <GenericTableTrack
            title={`${gene_name} variants`}
            height={200}
            tableConfig={tableDataConfig}
            tableData={R.take(20, exome_variants)}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default GenericTableTrackExample
