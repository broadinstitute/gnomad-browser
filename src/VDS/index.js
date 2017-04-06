/* eslint-disable camelcase */
import React, { Component } from 'react'
import R from 'ramda'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import fetch from 'isomorphic-fetch'

import {
  fetchTranscriptsByGeneName,
} from 'utilities'  // eslint-disable-line

import {
  groupExonsByTranscript,
} from 'utilities/transcriptTools'  // eslint-disable-line

import RegionViewer from '../RegionViewer'

import TranscriptTrack from '../Tracks/TranscriptTrack'
import VariantTrack from '../Tracks/VariantTrack'
import LoadingTrack from '../Tracks/LoadingTrack'

import css from './styles.css'

const API_URL = 'http://localhost:8004/graphql'

const fetchVariantsFromHail = (geneName) => {
  const query = `{"query": "query test($geneName: String!) {gene(gene_name: $geneName) { gene_name exome_variants { start info { CSQ GQ_HIST_ALT GQ_HIST_ALL DP_HIST_ALL BaseQRankSum ClippingRankSum FS InbreedingCoeff MQ MQRankSum QD ReadPosRankSum SOR VQSLOD AN AN_AFR AN_AMR AN_ASJ AN_EAS AN_FIN AN_NFE AN_OTH AN_SAS}}}}", "variables": {"geneName": "${geneName}"}}`

  const header = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  })

  return new Promise((resolve, reject) => {
    fetch(API_URL, {
      method: 'POST',
      body: query,
      headers: header,
    })
      .then(response => {
        resolve(response.json())
      })
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}

class VDSPage extends Component {
  state = {
    hasData: false,
    variantsFetched: false,
    currentGene: 'SRY',
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
      'SRY',
      'UTY',
      'ZFY',
    ],
  }

  componentDidMount() {
    this.fetchTranscripts()
    this.fetchVariants()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene) {
      this.fetchTranscripts()
      this.fetchVariants()
    }
  }

  fetchTranscripts = () => {
    fetchTranscriptsByGeneName(this.state.currentGene).then((data) => {
      this.setState({ transcriptData: data })
      this.setState({ hasData: true })
    })
  }

  fetchVariants = () => {
    fetchVariantsFromHail(this.state.currentGene).then((data) => {
      // console.log(data)
      this.setState({ variantData: data.data.gene })
      this.setState({ variantsFetched: true })
    })
  }

  handleChange = (event, index, value) => {
    this.setState({ currentGene: value })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    const geneExons = this.state.transcriptData.exons
    const canonicalExons = this.state.transcriptData.transcript.exons
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

    let variantsComponent = <LoadingTrack height={25} />
    if (this.state.variantsFetched) {
      const variants = this.state.variantData.exome_variants
      const variantsRdy = variants.map(v => ({ ...v, pos: v.start }))
      variantsComponent = (
        <VariantTrack
          title={'VDS variants'}
          height={25}
          variants={variantsRdy}
        />
      )
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
          {variantsComponent}
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default VDSPage
