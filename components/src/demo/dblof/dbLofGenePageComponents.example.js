/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'

import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
import RefreshIndicator from 'material-ui/RefreshIndicator'
import Checkbox from 'material-ui/Checkbox'

import { groupExonsByTranscript, combineDataForTable } from 'utilities'
import { processVariantsList } from 'utilities/exalt/process'

import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../../Tracks/TranscriptTrack'
import VariantTrack from '../../Tracks/VariantTrack'
import VariantTable from '../../VariantTable'

import { TEST_GENES } from '../../constants'

import css from './styles.css'

const API_URL = process.env.API_URL

const vepFields = `{
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
}`

export const consequenceFetch = (geneName, datasets, consequence) => {
  const variantsQuery = datasets.map(dataset => `
    ${dataset}_variants(consequence: "${consequence}") {
      variant_id
      pos
      rsid
      filter
      allele_count
      allele_num
      allele_freq
      hom_count
      vep_annotations ${vepFields}
    }
  `)

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
      ${variantsQuery.join(' ')}
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

class dbLofGenePageComponents extends Component {
  state = {
    markerWidth: 5,
    markerStrokeWidth: 1,
    hasData: false,
    trackHeight: 30,
    currentGene: 'GRM3',
    currentDataset: 'genome',
    padding: 75,
    markerType: 'af',
    testGenes: TEST_GENES,
    consequence: 'lof',
    variantYPosition: 'center',
    tracksSplit: false,
    afMax: 0.00005,
    datasets: [
      // 'exacv1',
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
    this.setState({ isFetching: true })
    consequenceFetch(
      this.state.currentGene,
      this.state.datasets,
      this.state.consequence,
    ).then((data) => {
      // console.log(data)
      this.setState({
        geneData: data,
        hasData: true,
        isFetching: false,
      })
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

  handlMarkerWidthChange = (event, index, value) => {
    this.setState({ markerWidth: value })
  }

  handleMarkerStrokeWidthChange = (event, index, value) => {
    this.setState({ markerStrokeWidth: value })
  }

  handleMarkerTypeChange = (event, index, value) => {
    this.setState({ markerType: value })
  }

  handleVariantYChange = (event, index, value) => {
    this.setState({ variantYPosition: value })
  }

  handleAfMaxChange = (event, index, value) => {
    this.setState({ afMax: value })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  setTrackHeight = (event, newValue) => {
    const trackHeight = Math.floor(300 * newValue)
    this.setState({ trackHeight })
  }

  handleSplitConsequences = (event, isInputChecked) => {
    this.setState({ tracksSplit: isInputChecked })
  }

  render() {
    const refreshIndicatorPage = (
      <div
        style={{
          position: 'relative',
          width: 100,
        }}
      >
        <RefreshIndicator
          size={100}
          left={50}
          top={200}
          status={'loading'}
          style={{
            position: 'relative',
          }}
        />
      </div>
    )

    const refreshIndicatorSmall = (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 100,
        }}
      >
        <RefreshIndicator
          size={40}
          left={10}
          top={0}
          status={'loading'}
          style={{
            position: 'relative',
          }}
        />
      </div>
    )

    if (!this.state.hasData) return refreshIndicatorPage

    const { gene_name, genome_variants, exome_variants } = this.state.geneData

    const combineFields = {
      constantFields: [
        'chrom',
        'pos',
        'rsid',
        'vep_annotations',
        'variant_id',
      ],
      sumFields: [
        'allele_count',
        'allele_num',
        'hom_count',
      ],
      nestedSumFields: [],
      uniqueFields: ['allele_count', 'allele_num', 'hom_count', 'filter'],
    }

    const addDatasetLabel = (variants, label) => variants.map(v => ({ ...v, dataset: label }))

    const combinedVariants = combineDataForTable(
      [
        ...addDatasetLabel(genome_variants, 'genome'),
        ...addDatasetLabel(exome_variants, 'exome'),
      ],
      combineFields,
    )


    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)

    const canonicalExons = this.state.geneData.transcript.exons
    const variantsProcessed = processVariantsList(combinedVariants)
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
        { dataKey: 'variant_id', title: 'Variant ID', dataType: 'variantId', width: 200 },
        { dataKey: 'datasets', title: 'Source', dataType: 'datasets', width: 75 },
        // { dataKey: 'rsid', title: 'RSID', dataType: 'string', width: 100 },
        { dataKey: 'consequence', title: 'Consequence', dataType: 'string', width: 200 },
        { dataKey: 'first_lof_flag', title: 'LoF', dataType: 'string', width: 10 },
        // { dataKey: 'filter', title: 'Filter', dataType: 'filter', width: 100 },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer', width: 50 },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer', width: 75 },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float', width: 75 },
        { dataKey: 'hom_count', title: 'Hom', dataType: 'integer', width: 75 },
      ],
    }

    const consequenceCategories = [
      // { annotation: 'transcript_ablation', colour: '#ed2024' },
      { annotation: 'splice_acceptor_variant', colour: '#757575' },
      { annotation: 'splice_donor_variant', colour: '#757575' },
      { annotation: 'stop_gained', colour: '#757575' },
      { annotation: 'frameshift_variant', colour: '#757575' },
    ]

    const markerConfigCircle = {
      markerType: 'circle',
      circleRadius: this.state.markerWidth,
      circleStroke: 'black',
      circleStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
      fillColor: 'lof',
    }

    const markerConfigTick = {
      markerType: 'tick',
      tickHeight: 3,
      tickWidth: this.state.markerWidth,
      tickStroke: 'black',
      tickStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
      fillColor: 'lof',
    }

    const markerConfigAF = {
      ...markerConfigCircle,
      markerType: 'af',
      fillColor: 'lof',
      afMax: this.state.afMax,

    }

    const markerConfig = {
      circle: markerConfigCircle,
      tick: markerConfigTick,
      af: markerConfigAF,
    }

    const splitTracks = consequenceCategories.map((consequence, index) => {
      return (
        <VariantTrack
          key={`${consequence.annotation}-${index}`}
          title={consequence.annotation.replace('_', ' ')}
          height={this.state.trackHeight}
          color={consequence.colour}
          markerConfig={markerConfig[this.state.markerType]}
          variants={variantsProcessed.filter(variant =>
             R.contains(consequence.annotation, variant.consequence))
           }
        />
      )
    })

    const singleTrack = (
      <VariantTrack
        key={'lof-combined'}
        title={'vep lof'}
        height={this.state.trackHeight}
        color={'#757575'}
        markerConfig={markerConfig[this.state.markerType]}
        variants={variantsProcessed}
      />
    )

    console.log(variantsProcessed)

    return (
      <div className={css.page}>
        <h1>dbLof gene page components</h1>
        <div className={css.menus}>
          <p>Gene</p>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map((gene, i) =>
              <MenuItem key={`${gene}-menu-${i}`} value={gene} primaryText={gene} />,
            )}
          </DropDownMenu>
          <p>Variant width</p>
          <DropDownMenu value={this.state.markerWidth} onChange={this.handlMarkerWidthChange}>
            {[1, 2, 3, 4, 5].map(markerWidth =>
              <MenuItem key={`${markerWidth}-menu`} value={markerWidth} primaryText={markerWidth} />,
            )}
          </DropDownMenu>
          <p>Variant stroke</p>
          <DropDownMenu value={this.state.markerStrokeWidth} onChange={this.handleMarkerStrokeWidthChange}>
            {[0, 1, 2].map(markerStrokeWidth =>
              <MenuItem key={`${markerStrokeWidth}-menu`} value={markerStrokeWidth} primaryText={markerStrokeWidth} />,
            )}
          </DropDownMenu>
          <p>Variant position</p>
          <DropDownMenu value={this.state.variantYPosition} onChange={this.handleVariantYChange}>
            {['random', 'center'].map(yPositionSetting =>
              <MenuItem key={`${yPositionSetting}-menu`} value={yPositionSetting} primaryText={yPositionSetting} />,
            )}
          </DropDownMenu>
        </div>
        <div className={css.menus}>
          <p>markerType</p>
          <DropDownMenu value={this.state.markerType} onChange={this.handleMarkerTypeChange}>
            {['circle', 'tick', 'af'].map(markerType =>
              <MenuItem key={`${markerType}-menu`} value={markerType} primaryText={markerType} />,
            )}
          </DropDownMenu>
          <Checkbox
            label="Split consequences"
            onCheck={this.handleSplitConsequences}
            style={{ display: 'flex', width: 200, height: 25 }}
          />
          <p>AF domain max</p>
          <DropDownMenu value={this.state.afMax} onChange={this.handleAfMaxChange}>
            {[1, 0.1, 0.01, 0.001, 0.0001, 0.00005, 0.00001].map(afmax =>
              <MenuItem key={`${afmax}-menu`} value={afmax} primaryText={afmax} />,
            )}
          </DropDownMenu>
          <p>Track height</p>
          <Slider
            style={{
              width: 100,
            }}
            onChange={this.setTrackHeight}
          />
          <p>Exon padding</p>
          <Slider
            style={{
              width: 100,
            }}
            onChange={this.setPadding}
          />
          {this.state.isFetching && refreshIndicatorSmall}
        </div>
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
        {this.state.tracksSplit ? splitTracks : singleTrack}
        </RegionViewer>
        <VariantTable
          title={'lof variants'}
          height={400}
          width={1100}
          tableConfig={tableDataConfig}
          tableData={variantsProcessed}
          remoteRowCount={variantsProcessed.length}
        />
      </div>
    )
  }
}

export default dbLofGenePageComponents
