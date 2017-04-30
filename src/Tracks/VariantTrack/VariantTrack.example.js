/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'

import { groupExonsByTranscript } from 'utilities'
import { processVariantsList } from 'utilities/exalt/process'

import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../TranscriptTrack'
import VariantTrack from './index'

import { TEST_GENES } from '../../constants'

import css from './styles.css'

const API_URL = process.env.API_URL

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
      variants: ${dataset}_variants(consequence: "lof") {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
        vep_annotations {
          TSL
          ancestral
          SYMBOL
          EAS_MAF
          Feature
          Codons
          MOTIF_NAME
          DOMAINS
          SIFT
          VARIANT_CLASS
          CDS_position
          CCDS
          Allele
          PolyPhen
          MOTIF_SCORE_CHANGE
          IMPACT
          HGVSp
          ENSP
          LoF
          INTRON
          Existing_variation
          HGVSc
          LoF_filter
          MOTIF_POS
          HIGH_INF_POS
          AA_MAF
          LoF_flags
          AFR_MAF
          UNIPARC
          cDNA_position
          PUBMED
          ALLELE_NUM
          Feature_type
          GMAF
          HGNC_ID
          PHENO
          LoF_info
          SWISSPROT
          EXON
          EUR_MAF
          Consequence
          Protein_position
          Gene
          STRAND
          DISTANCE
          EA_MAF
          SYMBOL_SOURCE
          Amino_acids
          TREMBL
          CLIN_SIG
          SAS_MAF
          MINIMISED
          HGVS_OFFSET
          ASN_MAF
          BIOTYPE
          context
          SOMATIC
          AMR_MAF
          CANONICAL
        }
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        // console.log(data)
        resolve(data.data.gene)
      })
      .catch((error) => {
        // console.log(error)
        reject(error)
      })
  })
}

class VariantTrackExample extends Component {
  state = {
    circleRadius: 5,
    circleStrokeWidth: 1,
    hasData: false,
    currentGene: 'BRCA2',
    currentDataset: 'genome',
    padding: 75,
    markerType: 'tick',
    testGenes: TEST_GENES,
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
      // console.log(data)
      this.setState({ geneData: data })
      this.setState({ hasData: true })
    })
  }

  handleChange = (event, index, value) => {
    // console.log(value)
    this.setState({ currentGene: value })
  }

  handleDatasetChange = (event, index, value) => {
    // console.log(value)
    this.setState({ currentDataset: value })
  }

  handleCircleRadiusChange = (event, index, value) => {
    this.setState({ circleRadius: value })
  }

  handleCircleStrokeWidthChange = (event, index, value) => {
    this.setState({ circleStrokeWidth: value })
  }

  handleMarkerTypeChange = (event, index, value) => {
    this.setState({ markerType: value })
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
    const variantsProcessed = processVariantsList(variants)
    // console.log('proc var', variantsProcessed)
    const regionAttributesConfig = {
      CDS: {
        color: '#757575',
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
        { dataKey: 'consequence', title: 'Consequence', dataType: 'string' },
        { dataKey: 'filter', title: 'Filter', dataType: 'filter' },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer' },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer' },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float' },
      ],
    }

    const consequenceCategories = [
      // { annotation: 'transcript_ablation', colour: '#ed2024' },
      { annotation: 'splice_acceptor_variant', colour: '#f26424' },
      { annotation: 'splice_donor_variant', colour: '#f26424' },
      { annotation: 'stop_gained', colour: '#ed2024' },
      { annotation: 'frameshift_variant', colour: '#85489c' },
    ]

    const consequenceTracks = consequenceCategories.map((consequence, index) => (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={consequence.annotation.replace('_', ' ')}
        height={25}
        color={consequence.colour}
        markerType={this.state.markerType}
        markerRadius={this.state.circleRadius}
        markerStroke={'black'}
        markerStrokeWidth={this.state.circleStrokeWidth}
        yPositionSetting={'center'}
        variants={variantsProcessed.filter(variant =>
           R.contains(consequence.annotation, variant.consequence))
         }
      />
    ))

    return (
      <div className={css.page}>
        <h1>Variant track demo</h1>
        <div className={css.menus}>
          <p>Gene</p>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map((gene, i) =>
              <MenuItem key={`${gene}-menu-${i}`} value={gene} primaryText={gene} />,
            )}
          </DropDownMenu>
          <p>Dataset</p>
          <DropDownMenu value={this.state.currentDataset} onChange={this.handleDatasetChange}>
            {this.state.datasets.map(dataset =>
              <MenuItem key={`${dataset}-menu`} value={dataset} primaryText={dataset} />,
            )}
          </DropDownMenu>
          <p>Variant radius</p>
          <DropDownMenu value={this.state.circleRadius} onChange={this.handleCircleRadiusChange}>
            {[1, 2, 3, 4, 5].map(circleRadius =>
              <MenuItem key={`${circleRadius}-menu`} value={circleRadius} primaryText={circleRadius} />,
            )}
          </DropDownMenu>
          <p>Variant stroke</p>
          <DropDownMenu value={this.state.circleStrokeWidth} onChange={this.handleCircleStrokeWidthChange}>
            {[0, 1, 2].map(circleStrokeWidth =>
              <MenuItem key={`${circleStrokeWidth}-menu`} value={circleStrokeWidth} primaryText={circleStrokeWidth} />,
            )}
          </DropDownMenu>
          <p>markerType</p>
          <DropDownMenu value={this.state.markerType} onChange={this.handleMarkerTypeChange}>
            {['circle', 'tick'].map(markerType =>
              <MenuItem key={`${markerType}-menu`} value={markerType} primaryText={markerType} />,
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
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          {consequenceTracks}
        </RegionViewer>
      </div>
    )
  }
}

export default VariantTrackExample
