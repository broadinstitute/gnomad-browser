/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'

import { groupExonsByTranscript } from 'utilities'

// import { getClinicalSignificances } from './getAnnotations-spec'

import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../TranscriptTrack'
import VariantTrack from '../VariantTrack'
import GenericTableTrack from './index'

import css from './styles.css'

const API_URL = process.env.API_URL
const VDS_URL = 'http://localhost:8004/graphql'

const circleRadius = 3
const circleStrokeWidth = 1

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
        resolve(data.data.gene)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

class GenericTableTrackExample extends Component {
  state = {
    hasGnomadData: false,
    hasClinvarData: false,
    currentGene: 'CFTR',
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
    console.log('fetching clinvar')
    clinVarFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      console.log('fetched clinvar', data)
      this.setState({ clinvarData: data })
      this.setState({ hasClinvarData: true })
    })
  }

  fetchGnomadData = () => {
    genericTableFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      console.log('fetched gnomad', data)
      this.setState({ gnomadData: data })
      this.setState({ hasGnomadData: true })
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

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasClinvarData || !this.state.hasGnomadData ) {
      return <p className={css.cool}>Loading!</p>
    }

    const { clinvar_variants } = this.state.clinvarData
    const { gene_name, variants } = this.state.gnomadData
    const geneExons = this.state.gnomadData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)

    const canonicalExons = this.state.gnomadData.transcript.exons

    const regionAttributesConfig = {
      CDS: {
        color: 'black',
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

    const getClinicalSignificances = R.pipe(
      R.path(['info', 'CLINICAL_SIGNIFICANCE']),
      significance => significance.split('|'),
    )


    const formatClinVarVariant = v => ({
      variant_id: `${v.contig}-${v.start}-${v.ref}-${v.alt.split('/')[1]}`,
      pos: v.start,
      ...v.info,
      significances: getClinicalSignificances(v),
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

    const significanceCategories = [
      { annotation: 'Pathogenic', colour: '#FF2B00' },
      { annotation: 'Likely_pathogenic', colour: '#E88000' },
      { annotation: 'Uncertain_significance', colour: '#FFD300' },
      { annotation: 'Likely_benign', colour: '#A1E80C' },
      { annotation: 'Benign', colour: '#0DFF3C' },
      { annotation: 'not_provided', colour: '#9B988F' },
    ]

    const significanceTracks = significanceCategories.map(significance => (
      <VariantTrack
        title={significance.annotation.replace('_', ' ')}
        height={25}
        color={significance.colour}
        markerRadius={circleRadius}
        markerStroke={'black'}
        markerStrokeWidth={circleStrokeWidth}
        variants={clinvarVariantsFormatted.filter(variant =>
           R.contains(significance.annotation, variant.significances))
         }
      />
    ))

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
            title={this.state.currentDataset}
            height={25}
            color={'grey'}
            markerRadius={circleRadius}
            markerStroke={'black'}
            markerStrokeWidth={circleStrokeWidth}
            variants={variants}
          />
          <VariantTrack
            title={'All clinvar variants'}
            height={25}
            color={'grey'}
            markerRadius={circleRadius}
            markerStroke={'black'}
            markerStrokeWidth={circleStrokeWidth}
            variants={clinvarVariantsFormatted}
          />
          {significanceTracks}
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
