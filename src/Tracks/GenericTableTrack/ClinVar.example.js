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
const VDS_URL = 'http://localhost:8004/graphql'

export const clinVarFetch = (geneName) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_name
      gene_id
      chrom
      start
      stop
      clinvar_variants {
        contig
        start
        ref
        alt
        info {
          MEASURESET_TYPE
          MEASURESET_ID
          RCV
          ALLELE_ID
          SYMBOL
          HGVS_C
          HGVS_P
          MOLECULAR_CONSEQUENCE
          CLINICAL_SIGNIFICANCE
          PATHOGENIC
          BENIGN
          CONFLICTED
          REVIEW_STATUS
          GOLD_STARS
          ALL_SUBMITTERS
          ALL_TRAITS
          ALL_PMIDS
          INHERITANCE_MODES
          AGE_OF_ONSET
          PREVALENCE
          DISEASE_MECHANISM
          ORIGIN
          XREFS
        }
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(VDS_URL)(query)
      .then((data) => {
        console.log(data)
        resolve(data.data.gene)
      })
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}

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
    currentGene: 'BRCA2',
    currentDataset: 'exacv1',
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
      'ARID1B',
      'CHD7',
    ],
    datasets: [
      'exacv1',
      'exome',
      'genome',
    ],
  }

  componentDidMount() {
    this.fetchClinVarData()
    this.fetchGnomadData()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene ||
      previousState.currentDataset !== this.state.currentDataset) {
      this.fetchClinVarData()
      this.fetchGnomadData()
    }
  }

  fetchClinVarData = () => {
    clinVarFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      console.log(data)
      this.setState({ clinvarData: data })
      this.setState({ hasData: true })
    })
  }

  fetchGnomadData = () => {
    genericTableFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      console.log(data)
      this.setState({ gnomadData: data })
      this.setState({ hasData: true })
    })
  }

  handleChange = (event, index, value) => {
    console.log(value)
    this.setState({ currentGene: value })
  }

  handleDatasetChange = (event, index, value) => {
    console.log(value)
    this.setState({ currentDataset: value })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }

    const { clinvar_variants } = this.state.clinvarData
    const { gene_name, variants } = this.state.gnomadData
    const geneExons = this.state.gnomadData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)

    const canonicalExons = this.state.gnomadData.transcript.exons

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

    const formatClinVarVariant = v => ({
      variant_id: `${v.contig}-${v.start}-${v.ref}-${v.alt.split('/')[1]}`,
      pos: v.start,
      ...v.info,
    })

    const formatClinVarVariants = variants => variants.map(formatClinVarVariant)

    const tableDataConfig = {
      fields: [
        { dataKey: 'variant_id', title: 'Variant ID', dataType: 'string' },
        // { dataKey: 'rsid', title: 'RSID', dataType: 'string' },
        // { dataKey: 'MEASURESET_TYPE', title: 'MEASURESET_TYPE', dataType: 'string' },
        // { dataKey: 'MEASURESET_ID', title: 'MEASURESET_ID', dataType: 'string' },
        // { dataKey: 'RCV', title: 'RCV', dataType: 'string' },
        { dataKey: 'ALLELE_ID', title: 'ALLELE_ID', dataType: 'string' },
        // { dataKey: 'SYMBOL', title: 'SYMBOL', dataType: 'string' },
        { dataKey: 'HGVS_C', title: 'HGVS_C', dataType: 'string' },
        { dataKey: 'HGVS_P', title: 'HGVS_P', dataType: 'string' },
        { dataKey: 'MOLECULAR_CONSEQUENCE', title: 'MOLECULAR_CONSEQUENCE', dataType: 'string' },
        { dataKey: 'CLINICAL_SIGNIFICANCE', title: 'CLINICAL_SIGNIFICANCE', dataType: 'string' },
        { dataKey: 'PATHOGENIC', title: 'PATHOGENIC', dataType: 'string' },
        { dataKey: 'BENIGN', title: 'BENIGN', dataType: 'string' },
        { dataKey: 'CONFLICTED', title: 'CONFLICTED', dataType: 'string' },
        { dataKey: 'REVIEW_STATUS', title: 'REVIEW_STATUS', dataType: 'string' },
        { dataKey: 'GOLD_STARS', title: 'GOLD_STARS', dataType: 'string' },
        // { dataKey: 'ALL_SUBMITTERS', title: 'ALL_SUBMITTERS', dataType: 'string' },
        { dataKey: 'ALL_TRAITS', title: 'ALL_TRAITS', dataType: 'string' },
        // { dataKey: 'ALL_PMIDS', title: 'ALL_PMIDS', dataType: 'string' },
        { dataKey: 'INHERITANCE_MODES', title: 'INHERITANCE_MODES', dataType: 'string' },
        { dataKey: 'AGE_OF_ONSET', title: 'AGE_OF_ONSET', dataType: 'string' },
        // { dataKey: 'PREVALENCE', title: 'PREVALENCE', dataType: 'string' },
        { dataKey: 'DISEASE_MECHANISM', title: 'DISEASE_MECHANISM', dataType: 'string' },
        { dataKey: 'ORIGIN', title: 'ORIGIN', dataType: 'string' },
        // { dataKey: 'XREFS', title: 'XREFS', dataType: 'string' },
      ],
    }

    const clinvarVariantsFormatted = formatClinVarVariants(clinvar_variants)
    console.log(clinvarVariantsFormatted)

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
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
        >
          <VariantTrack
            title={'Exome variants'}
            height={25}
            variants={variants}
          />
          <VariantTrack
            title={'Clinvar variants'}
            height={25}
            variants={clinvarVariantsFormatted}
          />
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          <GenericTableTrack
            title={`Clinvar variants for ${gene_name}`}
            height={800}
            tableConfig={tableDataConfig}
            tableData={R.take(100, clinvarVariantsFormatted)}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default GenericTableTrackExample
